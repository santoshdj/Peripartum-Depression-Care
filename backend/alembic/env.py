import asyncio
import logging
import re
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

# Import all models so they register with Base.metadata
from app.database import Base
from app.models import AuthState, Session, EpdsCache, LlmAuditLog  # noqa: F401
from app.utils.config import settings

logger = logging.getLogger('alembic.env')


def mask_db_password(url: str) -> str:
    """Mask password in database URL for safe logging."""
    return re.sub(r'(:)([^@:]+)(@)', r'\1****\3', url)


config = context.config

# Override the ini URL with the asyncpg version for async migrations
# Alembic runs async migrations, so it needs the asyncpg driver (not psycopg2)
logger.info("=== Alembic Migration Configuration ===")
logger.info(f"DATABASE_URL (masked): {mask_db_password(settings.DATABASE_URL)}")
logger.info(f"Driver: {settings.DATABASE_URL.split('://')[0] if '://' in settings.DATABASE_URL else 'unknown'}")

config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
logger.info("✓ Alembic configured with async engine")

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args={"ssl": False},
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
