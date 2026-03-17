from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from supabase import create_client

from .whatsapp_service import WhatsAppService
from .ai_handler import handle_message

import json


def _get_supabase_admin():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def _log_action(actor_id, action, target_table=None, target_id=None, metadata=None):
    supabase = _get_supabase_admin()
    supabase.table('audit_logs').insert({
        'actor_id': actor_id,
        'action': action,
        'target_table': target_table,
        'target_id': str(target_id) if target_id else None,
        'metadata': metadata or {},
    }).execute()


@api_view(['POST'])
def notify_leave(request):
    """
    POST /api/notifications/notify/leave/
    Body: { staff_id, leave_date, admin_phone }
    Sends a WhatsApp message to the admin notifying of staff leave.
    """
    staff_id = request.data.get('staff_id')
    leave_date = request.data.get('leave_date')
    admin_phone = request.data.get('admin_phone')

    if not all([staff_id, leave_date, admin_phone]):
        return Response(
            {'error': 'staff_id, leave_date, and admin_phone are required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Fetch staff name from Supabase
    supabase = _get_supabase_admin()
    staff = supabase.table('profiles').select('full_name').eq('id', staff_id).single().execute()
    staff_name = staff.data.get('full_name', 'A staff member') if staff.data else 'A staff member'

    message = f'{staff_name} has marked leave on {leave_date}. Please arrange coverage.'

    try:
        wa = WhatsAppService()
        wa.send_message(to=admin_phone, message=message)
    except Exception as e:
        return Response({'error': f'WhatsApp send failed: {e}'}, status=status.HTTP_502_BAD_GATEWAY)

    _log_action(
        actor_id=staff_id,
        action='LEAVE_NOTIFY',
        metadata={'leave_date': leave_date, 'admin_phone': admin_phone},
    )

    return Response({'message': 'Notification sent'})


@csrf_exempt
def whatsapp_webhook(request):
    """
    GET  — WhatsApp webhook verification (no auth required)
    POST — Incoming WhatsApp message handler
    """
    if request.method == 'GET':
        mode = request.GET.get('hub.mode')
        token = request.GET.get('hub.verify_token')
        challenge = request.GET.get('hub.challenge')

        if mode == 'subscribe' and token == settings.WHATSAPP_VERIFY_TOKEN:
            return HttpResponse(challenge, content_type='text/plain', status=200)
        return HttpResponse('Forbidden', status=403)

    if request.method == 'POST':
        try:
            payload = json.loads(request.body)
        except json.JSONDecodeError:
            return HttpResponse('Bad Request', status=400)

        wa = WhatsAppService()
        parsed = wa.parse_incoming(payload)

        if parsed['from'] and parsed['message']:
            reply = handle_message(parsed)
            try:
                wa.send_message(to=parsed['from'], message=reply)
            except Exception:
                pass  # Log but don't fail the webhook acknowledgment

        return HttpResponse('OK', status=200)

    return HttpResponse('Method Not Allowed', status=405)
