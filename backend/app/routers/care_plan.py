"""Care Plan API endpoints.

Provides AI-generated actionable suggestions when EPDS score >= 10.
Suggestions are displayed to patient but not written to FHIR.
See CONTEXT.md: Care Plan Suggestions
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.session import get_current_session
from app.models.epds_cache import EpdsCache
from app.models.session import Session
from app.services.care_plan_service import generate_care_plan_suggestions
from app.services.fhir_client import FhirClient
from app.services.fhir_resources import (
    get_conditions,
    get_medications,
    get_appointments,
)

router = APIRouter(prefix="/api/care-plan", tags=["care-plan"])


class CarePlanSuggestionsResponse(BaseModel):
    suggestions: list[str]
    disclaimer: str
    epds_score: int | None


DISCLAIMER = (
    "AI-generated suggestions · Not a treatment plan · "
    "Discuss with your care team"
)


@router.get("/suggestions")
async def get_care_plan_suggestions(
    current_session: Session = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> CarePlanSuggestionsResponse:
    """
    Returns AI-generated care plan suggestions when EPDS score >= 10.
    
    Suggestions are contextual (based on EPDS score, diary trends, FHIR data).
    Returns empty array if latest EPDS score < 10 or no EPDS on record.
    
    Results are NOT cached (always generate fresh suggestions).
    Consider adding caching layer (24 hour TTL) in production.
    """
    # Fetch latest EPDS score from cache
    result = await db.execute(
        select(EpdsCache)
        .where(EpdsCache.fhir_patient_id == current_session.fhir_patient_id)
        .order_by(EpdsCache.submitted_at.desc())
        .limit(1)
    )
    latest_epds = result.scalar_one_or_none()
    
    # Return empty if no EPDS or score < 10
    if latest_epds is None or latest_epds.score < 10:
        return CarePlanSuggestionsResponse(
            suggestions=[],
            disclaimer=DISCLAIMER,
            epds_score=latest_epds.score if latest_epds else None,
        )
    
    # Fetch FHIR context
    client = FhirClient(current_session.fhir_access_token)
    patient_id = current_session.fhir_patient_id
    
    conditions_raw = await get_conditions(client, patient_id)
    medications_raw = await get_medications(client, patient_id)
    appointments_raw = await get_appointments(client, patient_id)
    
    # Extract display names for prompt context
    fhir_context = {
        "conditions": [
            {"display": c.get("code", {}).get("text", "Unknown condition")}
            for c in conditions_raw
        ],
        "medications": [
            {
                "display": (
                    m.get("medicationCodeableConcept", {}).get("text")
                    or m.get("medicationReference", {}).get("display")
                    or "Unknown medication"
                )
            }
            for m in medications_raw
        ],
        "appointments": [
            {
                "display": (
                    f"{a.get('appointmentType', {}).get('text', 'Appointment')} "
                    f"on {a.get('start', '').split('T')[0] if a.get('start') else 'scheduled'}"
                )
            }
            for a in appointments_raw
        ],
    }
    
    # Generate suggestions via Claude
    suggestions = await generate_care_plan_suggestions(
        epds_score=latest_epds.score,
        patient_fhir_id=patient_id,
        fhir_context=fhir_context,
        db=db,
    )
    
    return CarePlanSuggestionsResponse(
        suggestions=suggestions,
        disclaimer=DISCLAIMER,
        epds_score=latest_epds.score,
    )
