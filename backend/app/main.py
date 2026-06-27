from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.utils.config import settings
from app.routers import auth, dashboard, screening, history, fhir, diary, profile
from app.models import journal_entry  # noqa: F401 — ensures table is registered with Base
from app.models import weekly_summary  # noqa: F401 — ensures table is registered with Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (dev convenience — use alembic in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
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


@app.get("/health")
async def health():
    return {"status": "ok"}
