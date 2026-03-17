from supabase import create_client
from django.conf import settings


def log_action(actor_id, action, target_table=None, target_id=None, metadata=None):
    """Fire-and-forget audit log entry."""
    try:
        sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        entry = {
            'actor_id': actor_id or None,
            'action': action,
            'target_table': target_table,
            'target_id': str(target_id) if target_id else None,
            'metadata': metadata or {},
        }
        sb.table('audit_logs').insert(entry).execute()
    except Exception:
        pass
