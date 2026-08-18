from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.session import get_current_session
from app.models.session import Session
from app.services.smart_auth import build_auth_url, exchange_code_for_token
from app.utils.config import settings, get_provider_config

router = APIRouter(prefix="/auth", tags=["auth"])


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
    try:
        token_response = await exchange_code_for_token(code, state, db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Token exchange failed: {exc}")

    patient_id = token_response.get("patient")
    access_token = token_response.get("access_token")
    expires_in = int(
        token_response.get("expires_in", settings.SESSION_EXPIRE_HOURS * 3600)
    )

    if not patient_id or not access_token:
        raise HTTPException(status_code=502, detail="Incomplete token response from EHR")

    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    session = Session(
        fhir_access_token=access_token,
        fhir_patient_id=patient_id,
        expires_at=expires_at,
    )
    db.add(session)
    await db.flush()
    await db.commit()

    response = RedirectResponse(url=f"{settings.FRONTEND_URL}/dashboard")
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session.id,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=expires_in,
    )
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
