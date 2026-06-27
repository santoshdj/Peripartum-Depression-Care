from datetime import datetime, timezone

from fastapi import Cookie, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.session import Session
from app.utils.config import settings


async def get_current_session(
    session_id: str | None = Cookie(default=None, alias="session_id"),
    db: AsyncSession = Depends(get_db),
) -> Session:
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = await db.get(Session, session_id)
    if session is None:
        raise HTTPException(status_code=401, detail="Session not found")

    expires = session.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        await db.delete(session)
        raise HTTPException(status_code=401, detail="Session expired")

    return session
