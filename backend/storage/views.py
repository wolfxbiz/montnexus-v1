from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from supabase import create_client


def _get_supabase_admin():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def _log_action(actor_id, action, target_id=None, metadata=None):
    supabase = _get_supabase_admin()
    supabase.table('audit_logs').insert({
        'actor_id': actor_id,
        'action': action,
        'target_table': 'documents',
        'target_id': str(target_id) if target_id else None,
        'metadata': metadata or {},
    }).execute()


@api_view(['GET', 'POST'])
def files(request):
    if request.method == 'GET':
        return _list_files(request)
    return _create_file(request)


def _list_files(request):
    """GET /api/storage/files/ — list non-deleted documents."""
    supabase = _get_supabase_admin()
    result = supabase.table('documents').select('*').eq('is_deleted', False).execute()
    return Response(result.data)


def _create_file(request):
    """
    POST /api/storage/files/
    Body: { file_name, file_path, file_size, mime_type, category, tags }
    Called after the frontend has uploaded the binary to Supabase Storage.
    """
    actor_id = request.supabase_user.get('sub')
    data = {
        'uploader_id': actor_id,
        'file_name': request.data.get('file_name'),
        'file_path': request.data.get('file_path'),
        'file_size': request.data.get('file_size'),
        'mime_type': request.data.get('mime_type'),
        'category': request.data.get('category', ''),
        'tags': request.data.get('tags', []),
        'is_deleted': False,
    }

    if not data['file_name'] or not data['file_path']:
        return Response({'error': 'file_name and file_path are required'}, status=status.HTTP_400_BAD_REQUEST)

    supabase = _get_supabase_admin()
    result = supabase.table('documents').insert(data).execute()

    if result.data:
        doc_id = result.data[0]['id']
        _log_action(actor_id, 'UPLOAD', target_id=doc_id, metadata={'file_name': data['file_name']})
        return Response(result.data[0], status=status.HTTP_201_CREATED)

    return Response({'error': 'Insert failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def delete_file(request, file_id):
    """DELETE /api/storage/files/<file_id>/ — soft delete."""
    actor_id = request.supabase_user.get('sub')
    supabase = _get_supabase_admin()

    result = supabase.table('documents').update({'is_deleted': True}).eq('id', file_id).execute()

    if result.data:
        _log_action(actor_id, 'DELETE', target_id=file_id)
        return Response({'message': 'File deleted'})

    return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
