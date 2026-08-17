import asyncio
import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.session import get_current_session
from app.models.session import Session
from app.services import fhir_resources
from app.services.epds_service import RISK_THRESHOLD, assess_risk
from app.services.fhir_client import FhirClient
from app.services.summary_service import generate_narrative_summary

logger = logging.getLogger(__name__)

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
    logger.info("=== Dashboard route called ===")
    logger.info(f"Session ID: {current_session.id}")
    logger.info(f"Patient ID: {current_session.fhir_patient_id}")
    logger.info(f"Has FHIR token: {bool(current_session.fhir_access_token)}")
    
    try:
        client = FhirClient(current_session.fhir_access_token)
        patient_id = current_session.fhir_patient_id
        logger.info(f"FhirClient initialized for patient {patient_id}")

        # Fetch all FHIR data concurrently — individual failures are tolerated
        logger.info("Starting parallel FHIR resource fetch...")
        results = await asyncio.gather(
            fhir_resources.get_patient(client, patient_id),
            fhir_resources.get_conditions(client, patient_id),
            fhir_resources.get_medications(client, patient_id),
            fhir_resources.get_appointments(client, patient_id),
            fhir_resources.get_epds_observations(client, patient_id),
            return_exceptions=True,
        )
        logger.info("FHIR resource fetch completed")
        
        patient_raw, conditions_raw, medications_raw, appointments_raw, epds_raw = results
        
        # Log results for each resource type
        logger.info(f"Patient result type: {type(patient_raw).__name__}")
        if isinstance(patient_raw, Exception):
            logger.error(f"Patient fetch error: {patient_raw}")
        
        logger.info(f"Conditions result type: {type(conditions_raw).__name__}, count: {len(conditions_raw) if isinstance(conditions_raw, list) else 'N/A'}")
        if isinstance(conditions_raw, Exception):
            logger.error(f"Conditions fetch error: {conditions_raw}")
        
        logger.info(f"Medications result type: {type(medications_raw).__name__}, count: {len(medications_raw) if isinstance(medications_raw, list) else 'N/A'}")
        if isinstance(medications_raw, Exception):
            logger.error(f"Medications fetch error: {medications_raw}")
        
        logger.info(f"Appointments result type: {type(appointments_raw).__name__}, count: {len(appointments_raw) if isinstance(appointments_raw, list) else 'N/A'}")
        if isinstance(appointments_raw, Exception):
            logger.error(f"Appointments fetch error: {appointments_raw}")
        
        logger.info(f"EPDS result type: {type(epds_raw).__name__}, count: {len(epds_raw) if isinstance(epds_raw, list) else 'N/A'}")
        if isinstance(epds_raw, Exception):
            logger.error(f"EPDS fetch error: {epds_raw}")

        patient = patient_raw if isinstance(patient_raw, dict) else {}
        conditions = _simplify_conditions(conditions_raw) if isinstance(conditions_raw, list) else []
        medications = _simplify_medications(medications_raw) if isinstance(medications_raw, list) else []
        appointments = _simplify_appointments(appointments_raw) if isinstance(appointments_raw, list) else []

        latest_epds_score: int | None = None
        if isinstance(epds_raw, list) and epds_raw:
            latest_epds_score = epds_raw[0].get("valueInteger")
        
        logger.info(f"Latest EPDS score: {latest_epds_score}")

        patient_name = _patient_display_name(patient)
        logger.info(f"Patient name resolved: {patient_name}")

        logger.info("Generating narrative summary...")
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
        logger.info(f"Narrative summary generated: {narrative_summary[:100] if narrative_summary else 'None'}...")

        risk_alert = None
        if latest_epds_score is not None and latest_epds_score >= RISK_THRESHOLD:
            logger.info(f"EPDS score {latest_epds_score} >= threshold {RISK_THRESHOLD}, assessing risk...")
            result = assess_risk(latest_epds_score)
            risk_alert = {"message": result.message, "score": latest_epds_score}
            logger.warning(f"Risk alert generated: {risk_alert}")
        else:
            logger.info(f"No risk alert (score: {latest_epds_score}, threshold: {RISK_THRESHOLD})")

        response_data = {
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
        
        logger.info(f"Dashboard response prepared successfully with {len(conditions)} conditions, {len(medications)} medications, {len(appointments)} appointments")
        logger.info("=== Dashboard route completed successfully ===")
        
        return response_data
    
    except Exception as e:
        logger.error(f"!!! Dashboard route failed with exception: {type(e).__name__}: {e}", exc_info=True)
        raise
