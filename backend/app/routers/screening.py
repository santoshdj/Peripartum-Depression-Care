from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.session import get_current_session
from app.models.epds_cache import EpdsCache
from app.models.session import Session
from app.services.epds_service import EPDS_QUESTIONS, assess_risk, calculate_score
from app.services.fhir_client import FhirClient
from app.services.fhir_resources import submit_epds, create_provider_alert_task

router = APIRouter(prefix="/api/screening", tags=["screening"])


class EpdsSubmission(BaseModel):
    responses: dict[int, int]


@router.get("/questionnaire")
async def get_questionnaire():
    """Returns the EPDS questionnaire definition."""
    return {"questions": EPDS_QUESTIONS}


@router.post("/submit")
async def submit_screening(
    submission: EpdsSubmission,
    current_session: Session = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
):
    """
    Scores the EPDS, writes FHIR resources to the patient's EHR, and caches the result.
    
    When score >= 10, creates a Task resource to alert the provider.
    See CONTEXT.md: EPDS Risk Threshold
    """
    score = calculate_score(submission.responses)
    result = assess_risk(score)
    timestamp = datetime.now(timezone.utc).isoformat()

    client = FhirClient(current_session.fhir_access_token)
    
    # Write QuestionnaireResponse + Observation to patient's EHR
    qr_id, obs_id = await submit_epds(
        client,
        current_session.fhir_patient_id,
        submission.responses,
        score,
    )
    
    # Create provider alert Task if score >= 10 (clinical threshold)
    task_id = None
    if score >= 10:
        try:
            task_id = await create_provider_alert_task(
                client,
                current_session.fhir_patient_id,
                score,
                timestamp,
            )
        except Exception as e:
            # Log error but don't block EPDS submission
            # Patient still sees risk alert on dashboard
            print(f"Warning: Failed to create provider alert Task: {e}")

    # Cache EPDS result for dashboard performance
    db.add(
        EpdsCache(
            fhir_patient_id=current_session.fhir_patient_id,
            score=score,
            fhir_observation_id=obs_id,
            fhir_questionnaire_response_id=qr_id,
        )
    )

    response = {
        "score": result.score,
        "risk": result.risk,
        "message": result.message,
        "threshold": 10,
        "fhir_observation_id": obs_id,
        "fhir_questionnaire_response_id": qr_id,
    }
    
    # Include task_id in response if created
    if task_id:
        response["provider_alert_task_id"] = task_id
    
    return response
