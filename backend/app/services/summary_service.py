import hashlib
import logging

from anthropic import AsyncAnthropic
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.llm_audit_log import LlmAuditLog
from app.utils.config import settings

logger = logging.getLogger(__name__)

_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

_SYSTEM_PROMPT = """You are a health information assistant for a peripartum depression care app.
Your role is to summarise a patient's current health information in clear, plain, compassionate language
that is easy for a non-medical reader to understand.

Rules:
- Write 2-3 short paragraphs maximum
- Use plain, warm language; avoid medical jargon
- Do NOT provide diagnosis, clinical recommendations, or medication advice
- Do NOT suggest the patient should or should not take any specific action
- You are summarising existing information only — not interpreting or advising
- If the EPDS score is elevated (10 or above), gently note that connecting with their care team is a good idea
- Be encouraging and supportive in tone"""


def _build_prompt(context: dict) -> str:
    patient = context.get("patient", {})
    name = patient.get("name", "this patient")
    conditions = context.get("conditions", [])
    medications = context.get("medications", [])
    appointments = context.get("appointments", [])
    latest_epds = context.get("latest_epds")

    parts = [f"Please summarise the following health information for {name}:\n"]

    if conditions:
        names = [c.get("display", "Unknown") for c in conditions[:5]]
        parts.append(f"Active conditions: {', '.join(names)}")

    if medications:
        names = [m.get("display", "Unknown") for m in medications[:5]]
        parts.append(f"Current medications: {', '.join(names)}")

    if appointments:
        next_appt = appointments[0]
        parts.append(f"Next appointment: {next_appt.get('display', 'scheduled')}")

    if latest_epds is not None:
        parts.append(f"Most recent EPDS score: {latest_epds}/30")
    else:
        parts.append("No EPDS screenings on record yet")

    return "\n".join(parts)


async def generate_narrative_summary(
    fhir_context: dict,
    patient_id: str,
    db: AsyncSession,
) -> str:
    prompt = _build_prompt(fhir_context)
    prompt_hash = hashlib.sha256(prompt.encode()).hexdigest()

    try:
        response = await _client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=512,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        summary = response.content[0].text

        db.add(
            LlmAuditLog(
                fhir_patient_id=patient_id,
                model=settings.ANTHROPIC_MODEL,
                prompt_tokens=response.usage.input_tokens,
                completion_tokens=response.usage.output_tokens,
                prompt_hash=prompt_hash,
            )
        )
        return summary

    except Exception as exc:
        logger.error("Anthropic API error: %s", exc)
        raise HTTPException(status_code=502, detail="Summary generation temporarily unavailable")
