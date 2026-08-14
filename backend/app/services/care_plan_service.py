"""Care plan suggestions service using Anthropic Claude.

Generates 3-5 actionable next steps for patients with elevated EPDS scores (>= 10).
Suggestions are contextual (based on FHIR data + diary trends) but not clinical advice.
See CONTEXT.md: Care Plan Suggestions
"""

import hashlib
import logging
from datetime import datetime, timedelta, timezone

from anthropic import AsyncAnthropic
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.journal_entry import JournalEntry
from app.models.llm_audit_log import LlmAuditLog
from app.utils.config import settings

logger = logging.getLogger(__name__)

_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

_SYSTEM_PROMPT = """You are a supportive care coordinator for a peripartum depression support app.
Your role is to suggest 3-5 actionable next steps for a patient whose EPDS screening indicates elevated risk.

Rules:
- Provide EXACTLY 3-5 bullet points (no more, no less)
- Be specific and actionable (e.g., "Call X at Y number" or "Discuss Z at your next OB visit")
- Reference the patient's existing care context when relevant (upcoming appointments, current conditions, medications)
- Always include the National Maternal Mental Health Hotline: 1-833-943-5746
- Use warm, supportive language
- Do NOT diagnose, prescribe, or recommend specific treatments
- Do NOT suggest stopping/starting medications
- Suggestions should guide the patient to discuss concerns with their provider
- Frame suggestions as "consider," "you might," "talk to your provider about" — never prescriptive

Output format: Plain bullet list (use - for bullets, no numbering)"""


def _build_prompt(
    epds_score: int,
    diary_trends: dict | None,
    fhir_context: dict,
) -> str:
    """Build prompt for care plan suggestions."""
    parts = [
        "Generate 3-5 actionable next steps for a patient with peripartum depression.\n",
        f"**EPDS Score:** {epds_score}/30 (clinical threshold: 10)\n",
    ]
    
    # Diary trends (if available)
    if diary_trends and diary_trends.get("entry_count", 0) >= 3:
        parts.append("**Diary Trends (last 7 days):**")
        parts.append(f"- Average mood: {diary_trends['avg_mood']:.1f}/5")
        parts.append(f"- Average anxiety: {diary_trends['avg_anxiety']:.1f}/5")
        parts.append(f"- Average sleep: {diary_trends['avg_sleep']:.1f} hours")
        parts.append("")
    
    # FHIR context
    conditions = fhir_context.get("conditions", [])
    if conditions:
        cond_names = [c.get("display", "Unknown") for c in conditions[:3]]
        parts.append(f"**Active Conditions:** {', '.join(cond_names)}")
    
    medications = fhir_context.get("medications", [])
    if medications:
        med_names = [m.get("display", "Unknown") for m in medications[:3]]
        parts.append(f"**Current Medications:** {', '.join(med_names)}")
    
    appointments = fhir_context.get("appointments", [])
    if appointments:
        next_appt = appointments[0]
        parts.append(f"**Next Appointment:** {next_appt.get('display', 'scheduled')}")
    
    parts.append("\nSuggestions:")
    
    return "\n".join(parts)


async def get_diary_trends(
    patient_fhir_id: str,
    db: AsyncSession,
) -> dict | None:
    """
    Fetch diary trends for last 7 days.
    Returns None if < 3 entries (insufficient data).
    """
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    
    result = await db.execute(
        select(JournalEntry)
        .where(
            JournalEntry.patient_fhir_id == patient_fhir_id,
            JournalEntry.created_at >= seven_days_ago,
        )
        .order_by(JournalEntry.created_at.desc())
    )
    entries = result.scalars().all()
    
    if len(entries) < 3:
        return None
    
    # Calculate averages
    avg_mood = sum(e.mood_score for e in entries) / len(entries)
    avg_anxiety = sum(e.anxiety_score for e in entries) / len(entries)
    avg_sleep = sum(e.sleep_hours for e in entries) / len(entries)
    
    return {
        "entry_count": len(entries),
        "avg_mood": avg_mood,
        "avg_anxiety": avg_anxiety,
        "avg_sleep": avg_sleep,
    }


async def generate_care_plan_suggestions(
    epds_score: int,
    patient_fhir_id: str,
    fhir_context: dict,
    db: AsyncSession,
) -> list[str]:
    """
    Generate 3-5 AI-powered care plan suggestions.
    
    Args:
        epds_score: Total EPDS score (0-30)
        patient_fhir_id: FHIR Patient ID
        fhir_context: Dict with keys: conditions, medications, appointments
        db: Database session
        
    Returns:
        List of 3-5 suggestion strings (bullet points)
        
    Raises:
        HTTPException: If Claude API fails
    """
    # Fetch diary trends
    diary_trends = await get_diary_trends(patient_fhir_id, db)
    
    # Build prompt
    prompt = _build_prompt(epds_score, diary_trends, fhir_context)
    prompt_hash = hashlib.sha256(prompt.encode()).hexdigest()
    
    try:
        response = await _client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=800,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_text = response.content[0].text
        
        # Parse bullet points (lines starting with - or *)
        suggestions = []
        for line in raw_text.split("\n"):
            line = line.strip()
            if line.startswith("-") or line.startswith("*"):
                # Remove bullet character and leading whitespace
                suggestion = line.lstrip("-*").strip()
                if suggestion:
                    suggestions.append(suggestion)
        
        # Log to audit trail
        db.add(
            LlmAuditLog(
                fhir_patient_id=patient_fhir_id,
                model=settings.ANTHROPIC_MODEL,
                prompt_tokens=response.usage.input_tokens,
                completion_tokens=response.usage.output_tokens,
                prompt_hash=prompt_hash,
            )
        )
        
        return suggestions
    
    except Exception as exc:
        logger.error("Anthropic API error in care plan suggestions: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="Care plan suggestions temporarily unavailable",
        )
