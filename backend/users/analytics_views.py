from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from supabase import create_client
from datetime import datetime, timedelta, timezone


def _get_supabase_admin():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


@api_view(['GET'])
def summary(request):
    """
    GET /api/analytics/summary/
    Returns: { total_users, active_staff, total_documents, weekly_actions }
    Admin only.
    """
    supabase = _get_supabase_admin()

    total_users_res = supabase.table('profiles').select('id', count='exact').execute()
    active_staff_res = (
        supabase.table('profiles')
        .select('id', count='exact')
        .eq('role', 'staff')
        .eq('is_active', True)
        .execute()
    )
    total_docs_res = (
        supabase.table('documents')
        .select('id', count='exact')
        .eq('is_deleted', False)
        .execute()
    )

    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    weekly_actions_res = (
        supabase.table('audit_logs')
        .select('id', count='exact')
        .gte('created_at', week_ago)
        .execute()
    )

    return Response({
        'total_users': total_users_res.count or 0,
        'active_staff': active_staff_res.count or 0,
        'total_documents': total_docs_res.count or 0,
        'weekly_actions': weekly_actions_res.count or 0,
    })


@api_view(['GET'])
def activity(request):
    """
    GET /api/analytics/activity/
    Returns last 30 days of audit_log counts per day.
    """
    supabase = _get_supabase_admin()

    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    result = (
        supabase.table('audit_logs')
        .select('created_at')
        .gte('created_at', thirty_days_ago)
        .execute()
    )

    # Aggregate by date in Python
    counts: dict[str, int] = {}
    for row in (result.data or []):
        date_str = row['created_at'][:10]  # "YYYY-MM-DD"
        counts[date_str] = counts.get(date_str, 0) + 1

    activity_list = [{'date': d, 'actions': c} for d, c in sorted(counts.items())]
    return Response(activity_list)
