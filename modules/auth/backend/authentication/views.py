from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(['GET'])
def verify_token(request):
    """
    Returns the decoded Supabase user from the validated JWT.
    The middleware already validated the token — if we reach here, it's valid.
    """
    return Response({'user': request.supabase_user})
