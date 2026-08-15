from contextlib import asynccontextmanager
import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.utils.config import settings
from app.routers import auth, dashboard, screening, history, fhir, diary, profile, forum, care_plan
from app.models import journal_entry  # noqa: F401 — ensures table is registered with Base
from app.models import weekly_summary  # noqa: F401 — ensures table is registered with Base
from app.models import forum as forum_models  # noqa: F401 — ensures forum tables registered
from app.models import user  # noqa: F401 — ensures users table registered

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    stream=sys.stdout,
    force=True  # Override any existing config to ensure consistency
)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=== Application starting ===")
    
    # Database connection info
    from app.database import mask_db_password
    logger.info("=== Database Info ===")
    logger.info(f"DATABASE_URL (masked): {mask_db_password(settings.DATABASE_URL)}")
    try:
        # Parse connection details from URL
        # Format: postgresql+asyncpg://user:password@host:port/database
        if '://' in settings.DATABASE_URL:
            parts = settings.DATABASE_URL.split('://', 1)
            driver = parts[0]
            remaining = parts[1]
            if '@' in remaining:
                creds, location = remaining.split('@', 1)
                user = creds.split(':')[0] if ':' in creds else creds
                if '/' in location:
                    host_port, database = location.rsplit('/', 1)
                    host = host_port.split(':')[0] if ':' in host_port else host_port
                    port = host_port.split(':')[1] if ':' in host_port else '5432'
                    
                    logger.info(f"  Driver: {driver}")
                    logger.info(f"  Host: {host}")
                    logger.info(f"  Port: {port}")
                    logger.info(f"  Database: {database}")
                    logger.info(f"  User: {user}")
    except Exception as e:
        logger.warning(f"Could not parse DATABASE_URL: {e}")
    
    # FHIR configuration
    logger.info("=== FHIR Configuration ===")
    logger.info(f"FHIR Base URL: {settings.FHIR_BASE_URL}")
    logger.info(f"FHIR Client ID: {settings.FHIR_CLIENT_ID}")
    logger.info(f"FHIR Client Secret: {'[SET]' if settings.FHIR_CLIENT_SECRET else '[NOT SET - using PKCE]'}")
    logger.info(f"FHIR Client Secret value repr: {repr(settings.FHIR_CLIENT_SECRET)}")
    
    # Database schema managed by Alembic migrations (see backend/alembic/versions/)
    # Dockerfile runs: alembic upgrade head
    logger.info("=== Application ready ===")
    yield
    logger.info("=== Application shutting down ===")
    await engine.dispose()
    logger.info("✓ Database engine disposed")


app = FastAPI(
    title="Peripartum Depression Care Platform",
    description="SMART on FHIR patient-facing API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(screening.router)
app.include_router(history.router)
app.include_router(fhir.router)
app.include_router(diary.router)
app.include_router(profile.router)
app.include_router(forum.router)
app.include_router(care_plan.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
