from datetime import datetime
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from supabase import create_client

from .serializers import (
    StaffProfileSerializer, ShiftSerializer,
    LeaveRequestSerializer, AttendanceSerializer,
)
from .signals import log_action
from notifications.whatsapp_service import WhatsAppService


def _sb():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def _actor(request):
    return request.supabase_user.get('sub', '')


# ─────────────────────────────────────────
# STAFF PROFILES
# ─────────────────────────────────────────

@api_view(['GET', 'POST'])
def staff_list_create(request):
    sb = _sb()

    if request.method == 'GET':
        result = sb.table('staff_profiles').select(
            '*, profile:profiles(id, full_name, role, department, phone, avatar_url)'
        ).eq('is_deleted', False).order('created_at', desc=True).execute()
        return Response(result.data)

    ser = StaffProfileSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    data = {**ser.validated_data, 'is_deleted': False}
    data['profile_id'] = str(data['profile_id'])
    if data.get('joining_date'):
        data['joining_date'] = str(data['joining_date'])
    if data.get('salary'):
        data['salary'] = float(data['salary'])

    result = sb.table('staff_profiles').insert(data).execute()
    if result.data:
        log_action(_actor(request), 'STAFF_CREATED', 'staff_profiles',
                   result.data[0]['id'], {'profile_id': data['profile_id']})
        return Response(result.data[0], status=status.HTTP_201_CREATED)
    return Response({'error': 'Insert failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PATCH'])
def staff_detail(request, staff_id):
    sb = _sb()

    if request.method == 'GET':
        staff = sb.table('staff_profiles').select(
            '*, profile:profiles(id, full_name, role, department, phone, avatar_url)'
        ).eq('id', staff_id).eq('is_deleted', False).single().execute()

        if not staff.data:
            return Response({'error': 'Staff not found'}, status=status.HTTP_404_NOT_FOUND)

        # Attach upcoming shifts and leave summary
        shifts = sb.table('shifts').select('*').eq('staff_id', staff_id)\
            .gte('shift_date', datetime.utcnow().date().isoformat())\
            .order('shift_date').limit(14).execute()

        leave_summary = sb.table('leave_requests').select('leave_type, total_days, status')\
            .eq('staff_id', staff_id).eq('status', 'approved').eq('is_deleted', False).execute()

        return Response({
            **staff.data,
            'upcoming_shifts': shifts.data,
            'approved_leaves': leave_summary.data,
        })

    ser = StaffProfileSerializer(data=request.data, partial=True)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    data = ser.validated_data
    if data.get('joining_date'):
        data['joining_date'] = str(data['joining_date'])
    if data.get('salary'):
        data['salary'] = float(data['salary'])

    result = sb.table('staff_profiles').update(data).eq('id', staff_id).execute()
    if result.data:
        log_action(_actor(request), 'STAFF_UPDATED', 'staff_profiles', staff_id, data)
        return Response(result.data[0])
    return Response({'error': 'Update failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────
# SHIFTS
# ─────────────────────────────────────────

@api_view(['GET', 'POST'])
def shift_list_create(request):
    sb = _sb()

    if request.method == 'GET':
        query = sb.table('shifts').select(
            '*, staff:staff_profiles(id, profile:profiles(full_name))'
        )
        if staff_id := request.GET.get('staff_id'):
            query = query.eq('staff_id', staff_id)
        if date := request.GET.get('date'):
            query = query.eq('shift_date', date)
        if week_start := request.GET.get('week_start'):
            from datetime import timedelta
            week_end = (datetime.strptime(week_start, '%Y-%m-%d') + timedelta(days=6)).strftime('%Y-%m-%d')
            query = query.gte('shift_date', week_start).lte('shift_date', week_end)
        result = query.order('shift_date').order('start_time').execute()
        return Response(result.data)

    ser = ShiftSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    data = {**ser.validated_data}
    staff_id = str(data['staff_id'])
    shift_date = str(data['shift_date'])

    # Conflict check: staff on approved leave on this date?
    staff_record = sb.table('staff_profiles').select('id').eq('id', staff_id).single().execute()
    leave_conflict = sb.table('leave_requests').select('id, start_date, end_date').eq(
        'staff_id', staff_id
    ).eq('status', 'approved').eq('is_deleted', False).lte('start_date', shift_date).gte(
        'end_date', shift_date
    ).execute()

    data['staff_id'] = staff_id
    data['shift_date'] = shift_date
    data['start_time'] = str(data['start_time'])
    data['end_time'] = str(data['end_time'])
    data['created_by'] = _actor(request)

    result = sb.table('shifts').insert(data).execute()
    if result.data:
        log_action(_actor(request), 'SHIFT_CREATED', 'shifts', result.data[0]['id'], {
            'staff_id': staff_id, 'date': shift_date
        })
        response_data = result.data[0]
        if leave_conflict.data:
            response_data['_warning'] = 'Staff has approved leave on this date.'
        return Response(response_data, status=status.HTTP_201_CREATED)
    return Response({'error': 'Insert failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH', 'DELETE'])
def shift_detail(request, shift_id):
    sb = _sb()

    if request.method == 'PATCH':
        allowed = {'shift_date', 'start_time', 'end_time', 'shift_type', 'notes'}
        data = {k: str(v) for k, v in request.data.items() if k in allowed}
        result = sb.table('shifts').update(data).eq('id', shift_id).execute()
        if result.data:
            log_action(_actor(request), 'SHIFT_UPDATED', 'shifts', shift_id, data)
            return Response(result.data[0])
        return Response({'error': 'Update failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    sb.table('shifts').delete().eq('id', shift_id).execute()
    log_action(_actor(request), 'SHIFT_DELETED', 'shifts', shift_id)
    return Response({'message': 'Shift deleted'})


# ─────────────────────────────────────────
# LEAVE REQUESTS
# ─────────────────────────────────────────

@api_view(['GET', 'POST'])
def leave_list_create(request):
    sb = _sb()

    if request.method == 'GET':
        query = sb.table('leave_requests').select(
            '*, staff:staff_profiles(id, profile:profiles(full_name, phone))'
        ).eq('is_deleted', False)

        # Staff sees only own; admin sees all — enforced via RLS
        if staff_id := request.GET.get('staff_id'):
            query = query.eq('staff_id', staff_id)
        if lv_status := request.GET.get('status'):
            query = query.eq('status', lv_status)

        result = query.order('created_at', desc=True).execute()
        return Response(result.data)

    ser = LeaveRequestSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    data = {**ser.validated_data, 'is_deleted': False, 'status': 'pending'}
    data['staff_id'] = str(data['staff_id'])
    data['start_date'] = str(data['start_date'])
    data['end_date'] = str(data['end_date'])

    result = sb.table('leave_requests').insert(data).execute()
    if result.data:
        log_action(_actor(request), 'LEAVE_REQUESTED', 'leave_requests',
                   result.data[0]['id'], {'staff_id': data['staff_id']})
        return Response(result.data[0], status=status.HTTP_201_CREATED)
    return Response({'error': 'Insert failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
def leave_approve(request, leave_id):
    """Admin approves a leave request. Sends WhatsApp to staff."""
    sb = _sb()

    leave = sb.table('leave_requests').select(
        '*, staff:staff_profiles(id, profile:profiles(full_name, phone))'
    ).eq('id', leave_id).single().execute()

    if not leave.data:
        return Response({'error': 'Leave request not found'}, status=status.HTTP_404_NOT_FOUND)

    data = {
        'status': 'approved',
        'reviewed_by': _actor(request),
        'reviewed_at': datetime.utcnow().isoformat(),
    }
    result = sb.table('leave_requests').update(data).eq('id', leave_id).execute()

    if result.data:
        log_action(_actor(request), 'LEAVE_APPROVED', 'leave_requests', leave_id)
        record = leave.data
        staff_profile = record.get('staff') or {}
        profile = staff_profile.get('profile') or {}
        phone = profile.get('phone', '')

        # WhatsApp notification — fire-and-forget
        try:
            if phone:
                wa = WhatsAppService()
                wa.send_message(
                    to=phone,
                    message=(
                        f"Hi {profile.get('full_name', 'there')}, your "
                        f"{record['leave_type']} leave from {record['start_date']} "
                        f"to {record['end_date']} has been approved."
                    ),
                )
                sb.table('leave_requests').update({'whatsapp_notified': True}).eq(
                    'id', leave_id
                ).execute()
                log_action(_actor(request), 'WHATSAPP_LEAVE_APPROVED_SENT',
                           'leave_requests', leave_id, {'to': phone})
        except Exception:
            pass

        # Warn if staff has shifts on leave dates
        shifts = sb.table('shifts').select('shift_date').eq(
            'staff_id', record['staff_id']
        ).gte('shift_date', record['start_date']).lte('shift_date', record['end_date']).execute()

        response = {'message': 'Leave approved', **result.data[0]}
        if shifts.data:
            response['_warning'] = (
                f"Staff has {len(shifts.data)} shift(s) during leave period. "
                f"Please reassign."
            )
        return Response(response)

    return Response({'error': 'Update failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
def leave_reject(request, leave_id):
    """Admin rejects a leave request. Sends WhatsApp to staff."""
    sb = _sb()

    leave = sb.table('leave_requests').select(
        '*, staff:staff_profiles(id, profile:profiles(full_name, phone))'
    ).eq('id', leave_id).single().execute()

    if not leave.data:
        return Response({'error': 'Leave request not found'}, status=status.HTTP_404_NOT_FOUND)

    reason = request.data.get('reason', '')
    data = {
        'status': 'rejected',
        'reviewed_by': _actor(request),
        'reviewed_at': datetime.utcnow().isoformat(),
    }
    result = sb.table('leave_requests').update(data).eq('id', leave_id).execute()

    if result.data:
        log_action(_actor(request), 'LEAVE_REJECTED', 'leave_requests', leave_id,
                   {'reason': reason})
        record = leave.data
        staff_profile = record.get('staff') or {}
        profile = staff_profile.get('profile') or {}
        phone = profile.get('phone', '')

        try:
            if phone:
                wa = WhatsAppService()
                wa.send_message(
                    to=phone,
                    message=(
                        f"Hi {profile.get('full_name', 'there')}, your leave request "
                        f"for {record['start_date']} to {record['end_date']} was not approved."
                        + (f" Reason: {reason}" if reason else "")
                    ),
                )
                sb.table('leave_requests').update({'whatsapp_notified': True}).eq(
                    'id', leave_id
                ).execute()
        except Exception:
            pass

        return Response({'message': 'Leave rejected', **result.data[0]})

    return Response({'error': 'Update failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────
# LEAVE BALANCE
# ─────────────────────────────────────────

@api_view(['GET'])
def leave_balance(request, staff_id):
    sb = _sb()

    staff = sb.table('staff_profiles').select(
        'annual_leave_quota, sick_leave_quota'
    ).eq('id', staff_id).single().execute()

    if not staff.data:
        return Response({'error': 'Staff not found'}, status=status.HTTP_404_NOT_FOUND)

    quotas = staff.data
    approved = sb.table('leave_requests').select('leave_type, total_days').eq(
        'staff_id', staff_id
    ).eq('status', 'approved').eq('is_deleted', False).execute()

    used = {'annual': 0, 'sick': 0, 'emergency': 0, 'unpaid': 0}
    for row in (approved.data or []):
        ltype = row['leave_type']
        used[ltype] = used.get(ltype, 0) + (row['total_days'] or 0)

    annual_quota = quotas.get('annual_leave_quota', 14)
    sick_quota = quotas.get('sick_leave_quota', 7)

    return Response({
        'annual':    {'quota': annual_quota, 'used': used['annual'],    'remaining': annual_quota - used['annual']},
        'sick':      {'quota': sick_quota,   'used': used['sick'],      'remaining': sick_quota - used['sick']},
        'emergency': {'quota': None,         'used': used['emergency'], 'remaining': None},
        'unpaid':    {'quota': None,         'used': used['unpaid'],    'remaining': None},
    })


# ─────────────────────────────────────────
# ATTENDANCE
# ─────────────────────────────────────────

@api_view(['GET', 'POST'])
def attendance_list_create(request):
    sb = _sb()

    if request.method == 'GET':
        query = sb.table('attendance').select(
            '*, staff:staff_profiles(id, profile:profiles(full_name))'
        )
        if staff_id := request.GET.get('staff_id'):
            query = query.eq('staff_id', staff_id)
        if month := request.GET.get('month'):  # format: 2026-03
            query = query.gte('date', f'{month}-01').lte('date', f'{month}-31')
        result = query.order('date', desc=True).execute()
        return Response(result.data)

    ser = AttendanceSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    data = {**ser.validated_data}
    data['staff_id'] = str(data['staff_id'])
    data['date'] = str(data['date'])
    if data.get('check_in'):
        data['check_in'] = data['check_in'].isoformat()
    if data.get('check_out'):
        data['check_out'] = data['check_out'].isoformat()

    # Upsert: one record per staff per date
    result = sb.table('attendance').upsert(data, on_conflict='staff_id,date').execute()
    if result.data:
        log_action(_actor(request), 'ATTENDANCE_MARKED', 'attendance',
                   result.data[0]['id'], {'staff_id': data['staff_id'], 'date': data['date']})
        return Response(result.data[0], status=status.HTTP_201_CREATED)
    return Response({'error': 'Insert failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
def attendance_detail(request, attendance_id):
    sb = _sb()
    allowed = {'check_in', 'check_out', 'status', 'notes'}
    data = {k: v for k, v in request.data.items() if k in allowed}
    result = sb.table('attendance').update(data).eq('id', attendance_id).execute()
    if result.data:
        log_action(_actor(request), 'ATTENDANCE_UPDATED', 'attendance', attendance_id, data)
        return Response(result.data[0])
    return Response({'error': 'Update failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
