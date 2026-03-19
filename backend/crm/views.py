from datetime import datetime, timedelta
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from supabase import create_client

from .serializers import PatientSerializer, AppointmentSerializer, VisitRecordSerializer
from .signals import log_action
from notifications.whatsapp_service import WhatsAppService


def _sb():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def _actor(request):
    return request.supabase_user.get('sub', '')


# ─────────────────────────────────────────
# PATIENTS
# ─────────────────────────────────────────

@api_view(['GET', 'POST'])
def patient_list_create(request):
    sb = _sb()
    actor_id = _actor(request)
    
    profile = sb.table('profiles').select('role').eq('id', actor_id).single().execute()
    role = profile.data.get('role', 'user') if profile.data else 'user'

    if request.method == 'GET':
        query = sb.table('patients').select(
            '*, assigned_doctor:profiles(id, full_name)'
        ).eq('is_deleted', False)

        if role != 'admin':
            visits = sb.table('visit_records').select('patient_id').eq('doctor_id', actor_id).execute()
            handled_ids = list(set([str(v['patient_id']) for v in (visits.data or [])]))
            
            or_str = f"assigned_doctor_id.eq.{actor_id}"
            if handled_ids:
                or_str += f",id.in.({','.join(handled_ids)})"
            
            query = query.or_(or_str)

        # Optional filters
        if doctor_id := request.GET.get('doctor_id'):
            query = query.eq('assigned_doctor_id', doctor_id)
        if gender := request.GET.get('gender'):
            query = query.eq('gender', gender)
        if blood_group := request.GET.get('blood_group'):
            query = query.eq('blood_group', blood_group)
            
        if registered_after := request.GET.get('registered_after'):
            query = query.gte('created_at', registered_after)
            
        if min_age := request.GET.get('min_age'):
            try:
                max_dob = (datetime.utcnow() - timedelta(days=int(min_age)*365)).date().isoformat()
                query = query.lte('date_of_birth', max_dob)
            except ValueError:
                pass
                
        if max_age := request.GET.get('max_age'):
            try:
                min_dob = (datetime.utcnow() - timedelta(days=(int(max_age)+1)*365)).date().isoformat()
                query = query.gte('date_of_birth', min_dob)
            except ValueError:
                pass
                
        if is_dormant := request.GET.get('is_dormant'):
            if is_dormant.lower() == 'true':
                six_months_ago = (datetime.utcnow() - timedelta(days=180)).isoformat()
                active = sb.table('visit_records').select('patient_id').gte('visit_date', six_months_ago).execute()
                active_ids = list(set([v['patient_id'] for v in (active.data or [])]))
                if active_ids:
                    query = query.filter('id', 'not.in', f"({','.join(active_ids)})")

        if search := request.GET.get('search'):
            query = query.or_(f"full_name.ilike.%{search}%,phone.ilike.%{search}%")

        result = query.order('created_at', desc=True).execute()
        return Response(result.data)

    # POST — create patient
    ser = PatientSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    data = {**ser.validated_data, 'is_deleted': False}
    # Convert UUID fields to string for Supabase
    if data.get('assigned_doctor_id'):
        data['assigned_doctor_id'] = str(data['assigned_doctor_id'])
    if data.get('date_of_birth'):
        data['date_of_birth'] = str(data['date_of_birth'])

    result = sb.table('patients').insert(data).execute()
    if result.data:
        log_action(_actor(request), 'PATIENT_CREATED', 'patients', result.data[0]['id'],
                   {'full_name': data['full_name']})
        return Response(result.data[0], status=status.HTTP_201_CREATED)
    return Response({'error': 'Insert failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PATCH', 'DELETE'])
def patient_detail(request, patient_id):
    sb = _sb()

    if request.method == 'GET':
        patient = sb.table('patients').select(
            '*, assigned_doctor:profiles(id, full_name)'
        ).eq('id', patient_id).eq('is_deleted', False).single().execute()

        if not patient.data:
            return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)

        # Attach upcoming appointments and visit history
        appointments = sb.table('appointments').select('*').eq('patient_id', patient_id)\
            .eq('is_deleted', False).order('appointment_date', desc=True).limit(10).execute()

        visits = sb.table('visit_records').select(
            '*, doctor:profiles(id, full_name)'
        ).eq('patient_id', patient_id).order('visit_date', desc=True).limit(20).execute()

        return Response({
            **patient.data,
            'appointments': appointments.data,
            'visit_history': visits.data,
        })

    if request.method == 'PATCH':
        ser = PatientSerializer(data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        data = ser.validated_data
        if data.get('assigned_doctor_id'):
            data['assigned_doctor_id'] = str(data['assigned_doctor_id'])
        if data.get('date_of_birth'):
            data['date_of_birth'] = str(data['date_of_birth'])
        data['updated_at'] = datetime.utcnow().isoformat()

        result = sb.table('patients').update(data).eq('id', patient_id).execute()
        if result.data:
            log_action(_actor(request), 'PATIENT_UPDATED', 'patients', patient_id, data)
            return Response(result.data[0])
        return Response({'error': 'Update failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    if request.method == 'DELETE':
        sb.table('patients').update({'is_deleted': True}).eq('id', patient_id).execute()
        log_action(_actor(request), 'PATIENT_DELETED', 'patients', patient_id)
        return Response({'message': 'Patient deleted'})


# ─────────────────────────────────────────
# APPOINTMENTS
# ─────────────────────────────────────────

def _check_doctor_conflict(sb, doctor_id: str, appt_date: str, appt_time: str,
                            duration_minutes: int, exclude_id: str = None) -> bool:
    """Returns True if the doctor has a conflicting appointment at the given time."""
    result = sb.table('appointments').select('appointment_time, duration_minutes').eq(
        'doctor_id', doctor_id
    ).eq('appointment_date', appt_date).eq('is_deleted', False).neq(
        'status', 'cancelled'
    ).execute()

    new_start = datetime.strptime(appt_time, '%H:%M:%S') if ':' in appt_time else \
        datetime.strptime(appt_time, '%H:%M')
    new_end = new_start + timedelta(minutes=duration_minutes)

    for appt in (result.data or []):
        if exclude_id and appt.get('id') == exclude_id:
            continue
        t = appt['appointment_time']
        existing_start = datetime.strptime(t[:5], '%H:%M')
        existing_end = existing_start + timedelta(minutes=appt.get('duration_minutes', 30))
        if new_start < existing_end and new_end > existing_start:
            return True
    return False


@api_view(['GET', 'POST'])
def appointment_list_create(request):
    sb = _sb()

    if request.method == 'GET':
        query = sb.table('appointments').select(
            '*, patient:patients(id, full_name, phone), doctor:profiles!appointments_doctor_id_fkey(id, full_name)'
        ).eq('is_deleted', False)

        if doctor_id := request.GET.get('doctor_id'):
            query = query.eq('doctor_id', doctor_id)
        if appt_status := request.GET.get('status'):
            query = query.eq('status', appt_status)
        if date_from := request.GET.get('date_from'):
            query = query.gte('appointment_date', date_from)
        if date_to := request.GET.get('date_to'):
            query = query.lte('appointment_date', date_to)

        result = query.order('appointment_date', desc=False).order(
            'appointment_time', desc=False
        ).execute()
        return Response(result.data)

    # POST — create appointment
    ser = AppointmentSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    validated = ser.validated_data
    appt_date = str(validated['appointment_date'])
    appt_time = str(validated['appointment_time'])
    duration = validated.get('duration_minutes', 30)
    doctor_id = str(validated['doctor_id'])

    # Conflict check
    if _check_doctor_conflict(sb, doctor_id, appt_date, appt_time, duration):
        return Response(
            {'error': 'Doctor has a conflicting appointment at this time.'},
            status=status.HTTP_409_CONFLICT,
        )

    data = {
        **validated,
        'patient_id': str(validated['patient_id']),
        'doctor_id': doctor_id,
        'booked_by': _actor(request),
        'appointment_date': appt_date,
        'appointment_time': appt_time,
        'is_deleted': False,
        'whatsapp_reminder_sent': False,
    }

    result = sb.table('appointments').insert(data).execute()
    if result.data:
        created = result.data[0]
        log_action(_actor(request), 'APPOINTMENT_CREATED', 'appointments', created['id'], {
            'patient_id': data['patient_id'],
            'doctor_id': data['doctor_id'],
            'date': appt_date,
        })

        # Fire-and-forget: send WhatsApp confirmation to patient
        try:
            patient = sb.table('patients').select('phone, full_name').eq(
                'id', data['patient_id']
            ).single().execute().data or {}
            doctor = sb.table('profiles').select('full_name').eq(
                'id', data['doctor_id']
            ).single().execute().data or {}
            if patient.get('phone'):
                wa = WhatsAppService()
                wa.send_appointment_confirmation(
                    to=patient['phone'],
                    doctor_name=doctor.get('full_name', ''),
                    appt_date=appt_date,
                    appt_time=appt_time[:5],
                )
                sb.table('appointments').update({'whatsapp_reminder_sent': True}).eq(
                    'id', created['id']
                ).execute()
                log_action(_actor(request), 'WHATSAPP_CONFIRMATION_SENT',
                           'appointments', created['id'], {'to': patient['phone']})
        except Exception:
            pass  # WhatsApp is fire-and-forget — never block the main action

        return Response(created, status=status.HTTP_201_CREATED)
    return Response({'error': 'Insert failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PATCH', 'DELETE'])
def appointment_detail(request, appointment_id):
    sb = _sb()

    if request.method == 'GET':
        result = sb.table('appointments').select(
            '*, patient:patients(id, full_name, phone, blood_group), doctor:profiles!appointments_doctor_id_fkey(id, full_name)'
        ).eq('id', appointment_id).single().execute()
        if not result.data:
            return Response({'error': 'Appointment not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(result.data)

    if request.method == 'PATCH':
        allowed_fields = {'status', 'notes', 'reason', 'appointment_date',
                          'appointment_time', 'duration_minutes', 'type'}
        data = {k: v for k, v in request.data.items() if k in allowed_fields}

        if not data:
            return Response({'error': 'No valid fields to update'}, status=status.HTTP_400_BAD_REQUEST)

        # If rescheduling, re-check conflict
        if 'appointment_date' in data or 'appointment_time' in data or 'duration_minutes' in data:
            existing = sb.table('appointments').select('*').eq(
                'id', appointment_id
            ).single().execute().data or {}
            check_date = data.get('appointment_date', existing.get('appointment_date'))
            check_time = data.get('appointment_time', existing.get('appointment_time'))
            check_dur = data.get('duration_minutes', existing.get('duration_minutes', 30))
            check_doc = existing.get('doctor_id')
            if _check_doctor_conflict(sb, check_doc, str(check_date), str(check_time),
                                       check_dur, exclude_id=appointment_id):
                return Response({'error': 'Doctor has a conflicting appointment at this time.'},
                                status=status.HTTP_409_CONFLICT)

        data['updated_at'] = datetime.utcnow().isoformat()
        result = sb.table('appointments').update(data).eq('id', appointment_id).execute()
        if result.data:
            log_action(_actor(request), 'APPOINTMENT_UPDATED', 'appointments', appointment_id, data)
            return Response(result.data[0])
        return Response({'error': 'Update failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    if request.method == 'DELETE':
        sb.table('appointments').update({'is_deleted': True}).eq('id', appointment_id).execute()
        log_action(_actor(request), 'APPOINTMENT_DELETED', 'appointments', appointment_id)
        return Response({'message': 'Appointment deleted'})


# ─────────────────────────────────────────
# VISIT RECORDS
# ─────────────────────────────────────────

@api_view(['GET', 'POST'])
def visit_list_create(request):
    sb = _sb()

    if request.method == 'GET':
        query = sb.table('visit_records').select(
            '*, doctor:profiles(id, full_name)'
        )
        if patient_id := request.GET.get('patient_id'):
            query = query.eq('patient_id', patient_id)
        result = query.order('visit_date', desc=True).execute()
        return Response(result.data)

    # POST — create visit record
    ser = VisitRecordSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    validated = ser.validated_data
    data = {
        **validated,
        'patient_id': str(validated['patient_id']),
        'doctor_id': str(validated['doctor_id']),
        'appointment_id': str(validated['appointment_id']) if validated.get('appointment_id') else None,
        'follow_up_date': str(validated['follow_up_date']) if validated.get('follow_up_date') else None,
    }

    result = sb.table('visit_records').insert(data).execute()
    if result.data:
        record_id = result.data[0]['id']
        log_action(_actor(request), 'VISIT_RECORD_CREATED', 'visit_records', record_id, {
            'patient_id': data['patient_id'],
        })
        # If linked to appointment, mark it completed
        if data.get('appointment_id'):
            sb.table('appointments').update({'status': 'completed'}).eq(
                'id', data['appointment_id']
            ).execute()
        return Response(result.data[0], status=status.HTTP_201_CREATED)
    return Response({'error': 'Insert failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────
# WHATSAPP REMINDER
# ─────────────────────────────────────────

@api_view(['POST'])
def send_reminder(request, appointment_id):
    """
    POST /api/crm/appointments/:id/send-reminder/
    Sends a WhatsApp reminder to the patient for the given appointment.
    """
    sb = _sb()

    appt = sb.table('appointments').select(
        '*, patient:patients(id, full_name, phone), doctor:profiles!appointments_doctor_id_fkey(id, full_name)'
    ).eq('id', appointment_id).eq('is_deleted', False).single().execute()

    if not appt.data:
        return Response({'error': 'Appointment not found'}, status=status.HTTP_404_NOT_FOUND)

    appointment = appt.data
    patient = appointment.get('patient') or {}
    phone = patient.get('phone', '')

    if not phone:
        return Response({'error': 'Patient has no phone number on record.'},
                        status=status.HTTP_400_BAD_REQUEST)

    reminder_type = request.data.get('type', 'reminder')  # 'reminder' | 'cancellation'

    try:
        wa = WhatsAppService()
        if reminder_type == 'cancellation':
            wa.send_appointment_cancellation(
                to=phone,
                appt_date=appointment['appointment_date'],
            )
            action = 'WHATSAPP_CANCELLATION_SENT'
        else:
            wa.send_appointment_reminder(
                to=phone,
                appt_time=appointment['appointment_time'][:5],
            )
            action = 'WHATSAPP_REMINDER_SENT'

        # Mark reminder sent
        sb.table('appointments').update({'whatsapp_reminder_sent': True}).eq(
            'id', appointment_id
        ).execute()
        log_action(_actor(request), action, 'appointments', appointment_id, {'to': phone})

        return Response({'message': f'WhatsApp {reminder_type} sent to {phone}'})

    except Exception as e:
        return Response({'error': f'WhatsApp failed: {str(e)}'},
                        status=status.HTTP_502_BAD_GATEWAY)
