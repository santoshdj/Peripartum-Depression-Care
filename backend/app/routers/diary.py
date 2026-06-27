from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import and_, cast, Date, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.session import get_current_session
from app.models.journal_entry import JournalEntry
from app.models.session import Session
from app.models.weekly_summary import WeeklySummary
from app.services.diary_summary_service import generate_weekly_summary, _week_start

router = APIRouter(prefix="/api/diary", tags=["diary"])


class DiaryEntryCreate(BaseModel):
    mood_score: int = Field(..., ge=1, le=5)
    sleep_hours: int = Field(..., ge=0, le=12)
    anxiety_score: int = Field(..., ge=1, le=5)
    note: str | None = Field(None, max_length=2000)


class DiaryEntryResponse(BaseModel):
    id: str
    mood_score: int
    sleep_hours: int
    anxiety_score: int
    note: str | None
    created_at: str


@router.get("/entries")
async def list_entries(
    current_session: Session = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
):
    """Returns all diary entries for the authenticated patient, newest first."""
    result = await db.execute(
        select(JournalEntry)
        .where(JournalEntry.patient_fhir_id == current_session.fhir_patient_id)
        .order_by(JournalEntry.created_at.desc())
    )
    entries = result.scalars().all()
    return {
        "entries": [
            DiaryEntryResponse(
                id=e.id,
                mood_score=e.mood_score,
                sleep_hours=e.sleep_hours,
                anxiety_score=e.anxiety_score,
                note=e.note,
                created_at=e.created_at.isoformat(),
            )
            for e in entries
        ]
    }


@router.post("/entries", status_code=201)
async def create_entry(
    payload: DiaryEntryCreate,
    current_session: Session = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
):
    """Creates a new diary entry for the authenticated patient."""
    entry = JournalEntry(
        patient_fhir_id=current_session.fhir_patient_id,
        mood_score=payload.mood_score,
        sleep_hours=payload.sleep_hours,
        anxiety_score=payload.anxiety_score,
        note=payload.note,
        created_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    await db.flush()
    return DiaryEntryResponse(
        id=entry.id,
        mood_score=entry.mood_score,
        sleep_hours=entry.sleep_hours,
        anxiety_score=entry.anxiety_score,
        note=entry.note,
        created_at=entry.created_at.isoformat(),
    )


@router.get("/today")
async def get_today_entry(
    current_session: Session = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
):
    """Returns today's diary entry for the patient, or null if none yet."""
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    tomorrow_start = today_start + timedelta(days=1)

    result = await db.execute(
        select(JournalEntry)
        .where(
            and_(
                JournalEntry.patient_fhir_id == current_session.fhir_patient_id,
                JournalEntry.created_at >= today_start,
                JournalEntry.created_at < tomorrow_start,
            )
        )
        .order_by(JournalEntry.created_at.desc())
        .limit(1)
    )
    entry = result.scalar_one_or_none()

    if entry is None:
        return {"entry": None}

    return {
        "entry": DiaryEntryResponse(
            id=entry.id,
            mood_score=entry.mood_score,
            sleep_hours=entry.sleep_hours,
            anxiety_score=entry.anxiety_score,
            note=entry.note,
            created_at=entry.created_at.isoformat(),
        )
    }


@router.get("/streak")
async def get_streak(
    current_session: Session = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
):
    """Returns the current consecutive check-in streak and whether today is checked in."""
    patient_id = current_session.fhir_patient_id

    result = await db.execute(
        select(cast(JournalEntry.created_at, Date).label("entry_date"))
        .where(JournalEntry.patient_fhir_id == patient_id)
        .distinct()
        .order_by(cast(JournalEntry.created_at, Date).desc())
    )
    dates: list[date] = [row.entry_date for row in result.fetchall()]

    today = datetime.now(timezone.utc).date()
    checked_in_today = bool(dates) and dates[0] == today

    streak = 0
    check = today
    for d in dates:
        if d == check:
            streak += 1
            check -= timedelta(days=1)
        elif d < check:
            break

    return {"streak": streak, "checked_in_today": checked_in_today}


@router.get("/weekly-summary")
async def get_weekly_summary(
    current_session: Session = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
):
    """Returns a Claude-generated weekly pattern summary, cached per patient per week."""
    patient_id = current_session.fhir_patient_id
    week_start = _week_start()
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)

    # Fetch entries from last 7 days
    result = await db.execute(
        select(JournalEntry)
        .where(
            and_(
                JournalEntry.patient_fhir_id == patient_id,
                JournalEntry.created_at >= seven_days_ago,
            )
        )
        .order_by(JournalEntry.created_at.asc())
    )
    entries = result.scalars().all()

    if len(entries) < 3:
        return {
            "available": False,
            "min_entries_required": 3,
            "entries_so_far": len(entries),
        }

    # Check cache
    cached = await db.execute(
        select(WeeklySummary).where(
            and_(
                WeeklySummary.patient_fhir_id == patient_id,
                WeeklySummary.week_start_date == week_start,
            )
        )
    )
    cached_summary = cached.scalar_one_or_none()

    # Use cache if it covers the same entry count (no new entries since generation)
    if cached_summary and cached_summary.entry_count == len(entries):
        return {
            "available": True,
            "summary": cached_summary.summary_text,
            "week_start": week_start.isoformat(),
            "entry_count": cached_summary.entry_count,
            "generated_at": cached_summary.generated_at.isoformat(),
        }

    # Generate fresh summary
    summary_text = await generate_weekly_summary(patient_id, list(entries), db)

    return {
        "available": True,
        "summary": summary_text,
        "week_start": week_start.isoformat(),
        "entry_count": len(entries),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
