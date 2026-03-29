from fastapi import Request

DEMO_USER = {"uid": "demo-user", "email": "demo@example.com", "name": "Demo User"}


async def verify_token(request: Request) -> dict:
    """Placeholder auth — returns demo user. Replace with real auth later."""
    return DEMO_USER
