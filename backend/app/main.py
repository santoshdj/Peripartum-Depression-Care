from contextlib import asynccontextmanager
import logging

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
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=== Application starting ===")
    logger.info(f"FHIR Base URL: {settings.FHIR_BASE_URL}")
    logger.info(f"FHIR Client ID: {settings.FHIR_CLIENT_ID}")
    logger.info(f"FHIR Client Secret: {'[SET]' if settings.FHIR_CLIENT_SECRET else '[NOT SET - using PKCE]'}")
    logger.info(f"FHIR Client Secret value repr: {repr(settings.FHIR_CLIENT_SECRET)}")
    # Create tables on startup (dev convenience — use alembic in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("=== Application ready ===")
    yield
    await engine.dispose()


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
