import jwt
from django.conf import settings


def decode_supabase_jwt(token: str) -> dict:
    """Decode and validate a Supabase JWT. Returns the payload or raises jwt.InvalidTokenError."""
    return jwt.decode(
        token,
        settings.SUPABASE_JWT_SECRET,
        algorithms=['HS256'],
        audience='authenticated',
    )


def get_user_id_from_request(request) -> str:
    """Extract the Supabase user UUID from the already-decoded middleware payload."""
    return request.supabase_user.get('sub', '')
