from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from supabase import create_client


def _get_supabase_admin():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


@api_view(['POST'])
def invite_user(request):
    """
    POST /api/users/invite/
    Body: { email, full_name, role, department }
    Admin-only: invites a user via Supabase Admin API.
    The DB trigger auto-creates the profile row.
    """
    # Verify caller is admin
    caller_role = getattr(request, 'supabase_user', {}).get('user_metadata', {}).get('role')
    if caller_role != 'admin':
        # Fall back to checking profiles table
        supabase = _get_supabase_admin()
        caller_id = request.supabase_user.get('sub')
        result = supabase.table('profiles').select('role').eq('id', caller_id).single().execute()
        if not result.data or result.data.get('role') != 'admin':
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    email = request.data.get('email')
    full_name = request.data.get('full_name', '')
    role = request.data.get('role', 'staff')
    department = request.data.get('department', '')

    if not email:
        return Response({'error': 'email is required'}, status=status.HTTP_400_BAD_REQUEST)

    if role not in ('admin', 'staff'):
        return Response({'error': 'role must be admin or staff'}, status=status.HTTP_400_BAD_REQUEST)

    supabase = _get_supabase_admin()
    try:
        result = supabase.auth.admin.invite_user_by_email(
            email,
            options={
                'data': {
                    'full_name': full_name,
                    'role': role,
                    'department': department,
                }
            },
        )
        return Response({'message': f'Invitation sent to {email}'}, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def list_users(request):
    """
    GET /api/users/
    Returns all profiles. Admin only.
    """
    caller_id = request.supabase_user.get('sub')
    supabase = _get_supabase_admin()

    caller = supabase.table('profiles').select('role').eq('id', caller_id).single().execute()
    if not caller.data or caller.data.get('role') != 'admin':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    result = supabase.table('profiles').select('*').execute()
    return Response(result.data)
