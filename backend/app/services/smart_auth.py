import base64
import hashlib
import secrets
from urllib.parse import urlencode

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth_state import AuthState
from app.utils.config import settings


def _generate_pkce_pair() -> tuple[str, str]:
    """Returns (code_verifier, code_challenge) for PKCE S256."""
    code_verifier = secrets.token_urlsafe(64)
    digest = hashlib.sha256(code_verifier.encode()).digest()
    code_challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return code_verifier, code_challenge


async def build_auth_url(db: AsyncSession) -> str:
    """Builds the EPIC SMART standalone authorization URL and persists PKCE state."""
    state = secrets.token_urlsafe(32)
    code_verifier, code_challenge = _generate_pkce_pair()

    auth_state = AuthState(state=state, code_verifier=code_verifier)
    db.add(auth_state)
    await db.flush()

    params = {
        "response_type": "code",
        "client_id": settings.EPIC_CLIENT_ID,
        "redirect_uri": settings.REDIRECT_URI,
        "scope": settings.SMART_SCOPES,
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "aud": settings.EPIC_FHIR_BASE_URL,
    }
    return f"{settings.EPIC_AUTH_BASE_URL}/authorize?{urlencode(params)}"


async def exchange_code_for_token(
    code: str, state: str, db: AsyncSession
) -> dict:
    """Verifies CSRF state, exchanges authorization code for FHIR access token."""
    auth_state = await db.get(AuthState, state)
    if not auth_state:
        raise ValueError("Invalid or expired state parameter")

    # Consume state immediately — one-time use
    await db.delete(auth_state)
    await db.flush()

    token_payload: dict = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.REDIRECT_URI,
        "client_id": settings.EPIC_CLIENT_ID,
        "code_verifier": auth_state.code_verifier,
    }
    if settings.EPIC_CLIENT_SECRET:
        token_payload["client_secret"] = settings.EPIC_CLIENT_SECRET

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.EPIC_AUTH_BASE_URL}/token",
            data=token_payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=15.0,
        )
        response.raise_for_status()
        return response.json()
