from fastapi import APIRouter, Depends

from app.middleware.session import get_current_session
from app.models.session import Session
from app.services.epds_service import RISK_THRESHOLD
from app.services.fhir_client import FhirClient
from app.services.fhir_resources import get_epds_observations

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("/epds")
async def get_epds_history(
    current_session: Session = Depends(get_current_session),
):
    """Returns all EPDS score observations for the patient, sorted newest-first."""
    client = FhirClient(current_session.fhir_access_token)
    observations = await get_epds_observations(client, current_session.fhir_patient_id)

    submissions = [
        {
            "date": obs.get("effectiveDateTime"),
            "score": obs.get("valueInteger"),
            "risk": "elevated" if (obs.get("valueInteger") or 0) >= RISK_THRESHOLD else "normal",
            "id": obs.get("id"),
        }
        for obs in observations
    ]

    return {"submissions": submissions, "threshold": RISK_THRESHOLD}
