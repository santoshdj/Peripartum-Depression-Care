from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.session import get_current_session
from app.models.epds_cache import EpdsCache
from app.models.session import Session
from app.services.epds_service import EPDS_QUESTIONS, assess_risk, calculate_score
from app.services.fhir_client import FhirClient
from app.services.fhir_resources import submit_epds

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
    """Scores the EPDS, writes both FHIR resources to EPIC, and caches the result."""
    score = calculate_score(submission.responses)
    result = assess_risk(score)

    client = FhirClient(current_session.fhir_access_token)
    qr_id, obs_id = await submit_epds(
        client,
        current_session.fhir_patient_id,
        submission.responses,
        score,
    )

    db.add(
        EpdsCache(
            fhir_patient_id=current_session.fhir_patient_id,
            score=score,
            fhir_observation_id=obs_id,
            fhir_questionnaire_response_id=qr_id,
        )
    )

    return {
        "score": result.score,
        "risk": result.risk,
        "message": result.message,
        "threshold": 10,
        "fhir_observation_id": obs_id,
        "fhir_questionnaire_response_id": qr_id,
    }
