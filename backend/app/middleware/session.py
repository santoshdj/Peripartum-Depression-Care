from datetime import datetime, timezone
import logging

from fastapi import Cookie, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.session import Session
from app.utils.config import settings

logger = logging.getLogger(__name__)


async def get_current_session(
    session_id: str | None = Cookie(default=None, alias="session_id"),
    db: AsyncSession = Depends(get_db),
) -> Session:
    logger.info("=== Session Middleware Called ===")
    logger.info(f"Cookie name expected: {settings.SESSION_COOKIE_NAME}")
    logger.info(f"Session ID from cookie: {session_id if session_id else '[NOT PROVIDED]'}")
    
    if not session_id:
        logger.warning("✗ No session cookie provided - returning 401")
        raise HTTPException(status_code=401, detail="Not authenticated")

    logger.info(f"Looking up session in database: {session_id}")
    session = await db.get(Session, session_id)
    
    if session is None:
        logger.error(f"✗ Session not found in database: {session_id}")
        raise HTTPException(status_code=401, detail="Session not found")
    
    logger.info(f"✓ Session found: patient_id={session.fhir_patient_id}, expires_at={session.expires_at}")

    expires = session.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    
    now = datetime.now(timezone.utc)
    logger.info(f"Current time: {now}")
    logger.info(f"Session expires: {expires}")
    logger.info(f"Time until expiry: {(expires - now).total_seconds()} seconds")
    
    if expires < now:
        logger.warning(f"✗ Session expired - deleting session {session_id}")
        await db.delete(session)
        raise HTTPException(status_code=401, detail="Session expired")

    logger.info("✓ Session valid - authentication successful")
    return session
