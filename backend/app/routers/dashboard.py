import asyncio

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.session import get_current_session
from app.models.session import Session
from app.services import fhir_resources
from app.services.epds_service import RISK_THRESHOLD, assess_risk
from app.services.fhir_client import FhirClient
from app.services.summary_service import generate_narrative_summary

router = APIRouter(prefix="/api", tags=["dashboard"])


def _patient_display_name(patient: dict) -> str:
    for name in patient.get("name", []):
        given = " ".join(name.get("given", []))
        family = name.get("family", "")
        full = f"{given} {family}".strip()
        if full:
            return full
    return "Patient"


def _simplify_conditions(raw: list[dict]) -> list[dict]:
    result = []
    for c in raw:
        coding = c.get("code", {}).get("coding", [{}])[0]
        result.append(
            {
                "display": c.get("code", {}).get("text") or coding.get("display", "Unknown"),
                "code": coding.get("code"),
            }
        )
    return result


def _simplify_medications(raw: list[dict]) -> list[dict]:
    result = []
    for m in raw:
        med = m.get("medicationCodeableConcept", {})
        coding = med.get("coding", [{}])[0]
        result.append(
            {
                "display": med.get("text") or coding.get("display", "Unknown"),
                "code": coding.get("code"),
                "authored_on": m.get("authoredOn"),
            }
        )
    return result


def _simplify_appointments(raw: list[dict]) -> list[dict]:
    result = []
    for a in raw:
        service_types = a.get("serviceType", [])
        display = (
            service_types[0].get("text", "") if service_types else a.get("description", "Appointment")
        )
        result.append(
            {
                "display": display,
                "start": a.get("start"),
                "status": a.get("status"),
            }
        )
    return result


@router.get("/dashboard")
async def get_dashboard(
    current_session: Session = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
):
    client = FhirClient(current_session.fhir_access_token)
    patient_id = current_session.fhir_patient_id

    # Fetch all FHIR data concurrently — individual failures are tolerated
    results = await asyncio.gather(
        fhir_resources.get_patient(client, patient_id),
        fhir_resources.get_conditions(client, patient_id),
        fhir_resources.get_medications(client, patient_id),
        fhir_resources.get_appointments(client, patient_id),
        fhir_resources.get_epds_observations(client, patient_id),
        return_exceptions=True,
    )
    patient_raw, conditions_raw, medications_raw, appointments_raw, epds_raw = results

    patient = patient_raw if isinstance(patient_raw, dict) else {}
    conditions = _simplify_conditions(conditions_raw) if isinstance(conditions_raw, list) else []
    medications = _simplify_medications(medications_raw) if isinstance(medications_raw, list) else []
    appointments = _simplify_appointments(appointments_raw) if isinstance(appointments_raw, list) else []

    latest_epds_score: int | None = None
    if isinstance(epds_raw, list) and epds_raw:
        latest_epds_score = epds_raw[0].get("valueInteger")

    patient_name = _patient_display_name(patient)

    narrative_summary = await generate_narrative_summary(
        {
            "patient": {"name": patient_name},
            "conditions": conditions,
            "medications": medications,
            "appointments": appointments,
            "latest_epds": latest_epds_score,
        },
        patient_id,
        db,
    )

    risk_alert = None
    if latest_epds_score is not None and latest_epds_score >= RISK_THRESHOLD:
        result = assess_risk(latest_epds_score)
        risk_alert = {"message": result.message, "score": latest_epds_score}

    return {
        "patient": {
            "id": patient_id,
            "name": patient_name,
            "birth_date": patient.get("birthDate"),
            "gender": patient.get("gender"),
        },
        "conditions": conditions,
        "medications": medications,
        "appointments": appointments,
        "latest_epds_score": latest_epds_score,
        "narrative_summary": narrative_summary,
        "risk_alert": risk_alert,
    }
