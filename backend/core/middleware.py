import jwt
from jwt import PyJWKClient
from django.conf import settings
from django.http import JsonResponse

# Cached JWKS client — fetches Supabase public keys once and caches them
_jwks_client = None

def _get_jwks_client():
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=3600)
    return _jwks_client


class SupabaseAuthMiddleware:
    EXEMPT_PATHS = [
        '/api/webhook/whatsapp/',
        '/admin/',
    ]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        for exempt in self.EXEMPT_PATHS:
            if request.path.startswith(exempt):
                return self.get_response(request)

        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return JsonResponse({'error': 'Unauthorized'}, status=401)

        token = auth_header.split(' ')[1]
        try:
            signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=['ES256', 'HS256'],
                audience='authenticated',
            )
            request.supabase_user = payload
        except jwt.ExpiredSignatureError:
            return JsonResponse({'error': 'Token expired'}, status=401)
        except Exception as e:
            return JsonResponse({'error': 'Invalid token'}, status=401)

        return self.get_response(request)
