"""
Audit log helper for CRM module.
Writes to public.audit_logs via Supabase client.
"""
from django.conf import settings
from supabase import create_client


def _supabase():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def log_action(actor_id: str, action: str, target_table: str, target_id: str, metadata: dict = None):
    """Write an audit log entry. Fire-and-forget — errors are swallowed so they never block the main action."""
    try:
        _supabase().table('audit_logs').insert({
            'actor_id': actor_id,
            'action': action,
            'target_table': target_table,
            'target_id': str(target_id) if target_id else None,
            'metadata': metadata or {},
        }).execute()
    except Exception:
        pass
