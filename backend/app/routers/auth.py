from datetime import datetime, timedelta, timezone
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.session import get_current_session
from app.models.session import Session
from app.services.smart_auth import build_auth_url, exchange_code_for_token
from app.utils.config import settings, get_provider_config

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


@router.get("/launch")
async def launch(
    provider: str = Query("epic", description="EHR provider (epic, cerner, allscripts, athenahealth)"),
    db: AsyncSession = Depends(get_db)
):
    """Initiates the SMART on FHIR standalone authorization flow for the selected provider."""
    try:
        provider_config = get_provider_config(provider)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    auth_url = await build_auth_url(db, provider_config)
    return RedirectResponse(url=auth_url)


@router.get("/callback")
async def callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Handles the OAuth2 redirect from the EHR, creates a session, sets HttpOnly cookie."""
    logger.info("=== OAuth Callback Started ===")
    logger.info(f"Code present: {bool(code)}, State present: {bool(state)}")
    
    try:
        token_response = await exchange_code_for_token(code, state, db)
        logger.info(f"✓ Token exchange successful. Response keys: {list(token_response.keys())}")
    except ValueError as exc:
        logger.error(f"✗ Token exchange ValueError: {exc}")
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error(f"✗ Token exchange failed: {exc}", exc_info=True)
        raise HTTPException(status_code=502, detail=f"Token exchange failed: {exc}")

    patient_id = token_response.get("patient")
    access_token = token_response.get("access_token")
    expires_in = int(
        token_response.get("expires_in", settings.SESSION_EXPIRE_HOURS * 3600)
    )

    logger.info(f"Patient ID: {patient_id}")
    logger.info(f"Access token present: {bool(access_token)}, length: {len(access_token) if access_token else 0}")
    logger.info(f"Expires in: {expires_in} seconds")

    if not patient_id or not access_token:
        logger.error("✗ Incomplete token response from EHR")
        raise HTTPException(status_code=502, detail="Incomplete token response from EHR")

    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    session = Session(
        fhir_access_token=access_token,
        fhir_patient_id=patient_id,
        expires_at=expires_at,
    )
    db.add(session)
    await db.flush()
    logger.info(f"✓ Session created with ID: {session.id}")
    
    await db.commit()
    logger.info("✓ Session committed to database")

    # Use SameSite=none for cross-origin cookies in production (requires Secure=True)
    # Use SameSite=lax for local development
    samesite_value = "none" if settings.COOKIE_SECURE else "lax"

    # Log cookie configuration
    logger.info("=== Cookie Configuration ===")
    logger.info(f"Cookie name: {settings.SESSION_COOKIE_NAME}")
    logger.info(f"Session ID: {session.id}")
    logger.info(f"HttpOnly: True")
    logger.info(f"Secure: {settings.COOKIE_SECURE}")
    logger.info(f"SameSite: {samesite_value}")
    logger.info(f"Max age: {expires_in} seconds")
    logger.info(f"Redirect URL: {settings.FRONTEND_URL}/dashboard")
    
    # Log CORS/domain info
    logger.info(f"ALLOWED_ORIGINS: {settings.ALLOWED_ORIGINS}")
    logger.info(f"FRONTEND_URL: {settings.FRONTEND_URL}")

    response = RedirectResponse(url=f"{settings.FRONTEND_URL}/dashboard")
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session.id,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=samesite_value,
        max_age=expires_in,
    )
    
    logger.info("=== OAuth Callback Complete - Redirecting to dashboard ===")
    return response


@router.post("/logout")
async def logout(
    current_session: Session = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
):
    """Destroys the session and clears the cookie."""
    await db.delete(current_session)
    await db.commit()
    response = RedirectResponse(url=settings.FRONTEND_URL, status_code=302)
    response.delete_cookie(settings.SESSION_COOKIE_NAME)
    return response


@router.get("/me")
async def me(current_session: Session = Depends(get_current_session)):
    """Returns the current authenticated patient context (for the frontend)."""
    return {
        "patient_id": current_session.fhir_patient_id,
        "expires_at": current_session.expires_at.isoformat(),
    }
