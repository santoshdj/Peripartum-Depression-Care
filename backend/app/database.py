import logging
import re
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.utils.config import settings

logger = logging.getLogger(__name__)


def mask_db_password(url: str) -> str:
    """Mask password in database URL for safe logging."""
    # Pattern: postgresql+asyncpg://user:password@host:port/db
    return re.sub(r'(:)([^@:]+)(@)', r'\1****\3', url)


# Log database connection details
logger.info("=== Database Configuration ===")
logger.info(f"DATABASE_URL (masked): {mask_db_password(settings.DATABASE_URL)}")
logger.info(f"Driver: {settings.DATABASE_URL.split('://')[0] if '://' in settings.DATABASE_URL else 'unknown'}")
logger.info(f"Echo SQL: False")

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

logger.info("✓ AsyncEngine created successfully")


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
