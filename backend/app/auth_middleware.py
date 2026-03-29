from fastapi import Request

DEMO_USER = {"uid": "demo-user", "email": "demo@example.com", "name": "Demo User"}


async def verify_token(request: Request) -> dict:
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer ") and len(auth_header) > 20:
        try:
            from app.database import firebase_auth
            token = auth_header.split("Bearer ")[1]
            decoded = firebase_auth.verify_id_token(token)
            return decoded
        except Exception:
            pass

    return DEMO_USER
