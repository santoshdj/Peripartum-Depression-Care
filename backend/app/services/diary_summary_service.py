import logging
from datetime import date, datetime, timedelta, timezone
from statistics import mean

from anthropic import AsyncAnthropic
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.journal_entry import JournalEntry
from app.models.weekly_summary import WeeklySummary
from app.utils.config import settings

logger = logging.getLogger(__name__)

_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

_SYSTEM_PROMPT = """You are a warm, supportive health companion for a peripartum depression care app.
A patient has been tracking their mood, sleep, and anxiety each day this week.
Your role is to gently describe the patterns you notice in their numbers — not to diagnose or advise.

Rules:
- Write exactly 3–4 sentences
- Use plain, warm, first-person-friendly language ("Your mood...", "You slept...")
- Do NOT diagnose, prescribe, or recommend clinical action
- Do NOT use medical jargon
- If the numbers suggest a hard week, acknowledge it with compassion; do not minimise
- End with one brief, genuinely encouraging observation
- You are describing patterns in numbers only — treat them as impersonal data points"""


def _week_start(today: date | None = None) -> date:
    """Returns the Monday of the current week (UTC)."""
    d = today or datetime.now(timezone.utc).date()
    return d - timedelta(days=d.weekday())


def _build_prompt(entries: list[JournalEntry]) -> str:
    moods = [e.mood_score for e in entries]
    sleeps = [e.sleep_hours for e in entries]
    anxieties = [e.anxiety_score for e in entries]

    avg_mood = round(mean(moods), 1)
    avg_sleep = round(mean(sleeps), 1)
    avg_anxiety = round(mean(anxieties), 1)

    best_day = max(entries, key=lambda e: e.mood_score)
    hardest_day = min(entries, key=lambda e: e.mood_score)

    days_checked_in = len(entries)

    return (
        f"This week ({days_checked_in} check-ins):\n"
        f"- Average mood: {avg_mood}/5 (best day: {best_day.created_at.strftime('%A')} at {best_day.mood_score}/5, "
        f"hardest day: {hardest_day.created_at.strftime('%A')} at {hardest_day.mood_score}/5)\n"
        f"- Average sleep: {avg_sleep} hours/night\n"
        f"- Average anxiety: {avg_anxiety}/5\n\n"
        "Please describe these patterns warmly in 3–4 sentences."
    )


async def generate_weekly_summary(
    patient_fhir_id: str,
    entries: list[JournalEntry],
    db: AsyncSession,
) -> str:
    """Generates and caches a weekly pattern summary using Claude."""
    prompt = _build_prompt(entries)

    try:
        response = await _client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=300,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        summary_text = response.content[0].text.strip()
    except Exception as exc:
        logger.error("Weekly summary Claude call failed: %s", exc)
        raise

    # Cache to DB
    week_start = _week_start()
    # Remove any existing entry for this week
    existing = await db.execute(
        select(WeeklySummary).where(
            and_(
                WeeklySummary.patient_fhir_id == patient_fhir_id,
                WeeklySummary.week_start_date == week_start,
            )
        )
    )
    old = existing.scalar_one_or_none()
    if old:
        await db.delete(old)

    new_summary = WeeklySummary(
        patient_fhir_id=patient_fhir_id,
        week_start_date=week_start,
        summary_text=summary_text,
        entry_count=len(entries),
        generated_at=datetime.now(timezone.utc),
    )
    db.add(new_summary)
    await db.flush()

    return summary_text
