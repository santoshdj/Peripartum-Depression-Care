import base64
import hashlib
import logging
import secrets
from urllib.parse import urlencode

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth_state import AuthState
from app.utils.config import settings, ProviderConfig, get_provider_config

logger = logging.getLogger(__name__)


def _generate_pkce_pair() -> tuple[str, str]:
    """Returns (code_verifier, code_challenge) for PKCE S256."""
    code_verifier = secrets.token_urlsafe(64)
    digest = hashlib.sha256(code_verifier.encode()).digest()
    code_challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return code_verifier, code_challenge


async def build_auth_url(db: AsyncSession, provider_config: ProviderConfig) -> str:
    """Builds the SMART standalone authorization URL with PKCE and persists state.
    
    Works with any FHIR R4-compliant EHR (Epic, Cerner, Allscripts, etc.).
    """
    state = secrets.token_urlsafe(32)
    code_verifier, code_challenge = _generate_pkce_pair()

    # Determine provider name from config (reverse lookup)
    from app.utils.config import PROVIDER_CONFIGS
    provider_name = "epic"  # default
    for name, config in PROVIDER_CONFIGS.items():
        if config.client_id == provider_config.client_id:
            provider_name = name
            break

    auth_state = AuthState(
        state=state, 
        code_verifier=code_verifier,
        provider=provider_name
    )
    db.add(auth_state)
    await db.flush()

    params = {
        "response_type": "code",
        "client_id": provider_config.client_id,
        "redirect_uri": settings.REDIRECT_URI,
        "scope": provider_config.scopes,
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "aud": provider_config.base_url,
    }
    return f"{provider_config.auth_url}?{urlencode(params)}"


async def exchange_code_for_token(
    code: str, state: str, db: AsyncSession
) -> dict:
    """Verifies CSRF state, exchanges authorization code for FHIR access token."""
    auth_state = await db.get(AuthState, state)
    if not auth_state:
        raise ValueError("Invalid or expired state parameter")

    # Get provider configuration from stored auth state
    provider_config = get_provider_config(auth_state.provider)

    # Consume state immediately — one-time use
    await db.delete(auth_state)
    await db.flush()

    token_payload: dict = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.REDIRECT_URI,
        "client_id": provider_config.client_id,
        "code_verifier": auth_state.code_verifier,
    }
    if provider_config.client_secret:
        token_payload["client_secret"] = provider_config.client_secret

    # Debug logging
    logger.info(f"=== TOKEN EXCHANGE DEBUG ===")
    logger.info(f"Provider: {auth_state.provider}")
    logger.info(f"Token URL: {provider_config.token_url}")
    logger.info(f"Client ID: {provider_config.client_id}")
    logger.info(f"Redirect URI: {settings.REDIRECT_URI}")
    logger.info(f"Client secret: {'[SET]' if provider_config.client_secret else '[NOT SET]'}")
    logger.info(f"Code length: {len(code)}")
    logger.info(f"Code verifier length: {len(auth_state.code_verifier)}")
    
    # Create masked copy for logging
    masked_payload = token_payload.copy()
    masked_payload['code'] = '[MASKED]'
    masked_payload['code_verifier'] = '[MASKED]'
    if 'client_secret' in masked_payload:
        masked_payload['client_secret'] = '[MASKED]'
    logger.info(f"Full token payload (masked): {masked_payload}")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                provider_config.token_url,
                data=token_payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=15.0,
            )
            logger.info(f"Response status: {response.status_code}")
            logger.info(f"Response headers: {dict(response.headers)}")
            
            response.raise_for_status()
            token_response = response.json()
            logger.info(f"Token exchange successful")
            return token_response
            
        except httpx.HTTPStatusError as e:
            logger.error(f"=== TOKEN EXCHANGE FAILED ===")
            logger.error(f"Status code: {e.response.status_code}")
            logger.error(f"Response body: {e.response.text}")
            logger.error(f"Response headers: {dict(e.response.headers)}")
            raise
