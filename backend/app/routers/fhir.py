from typing import Literal

from fastapi import APIRouter, Depends, Query

from app.middleware.session import get_current_session
from app.models.session import Session
from app.services import fhir_resources
from app.services.fhir_client import FhirClient

router = APIRouter(prefix="/api/fhir", tags=["fhir"])


@router.get("/conditions")
async def get_conditions(current_session: Session = Depends(get_current_session)):
    client = FhirClient(current_session.fhir_access_token)
    data = await fhir_resources.get_conditions(client, current_session.fhir_patient_id)
    return {"conditions": data}


@router.get("/medications")
async def get_medications(current_session: Session = Depends(get_current_session)):
    client = FhirClient(current_session.fhir_access_token)
    data = await fhir_resources.get_medications(client, current_session.fhir_patient_id)
    return {"medications": data}


@router.get("/appointments")
async def get_appointments(current_session: Session = Depends(get_current_session)):
    client = FhirClient(current_session.fhir_access_token)
    data = await fhir_resources.get_appointments(client, current_session.fhir_patient_id)
    return {"appointments": data}


@router.get("/observations")
async def get_observations(
    category: Literal["laboratory", "vital-signs"] = Query(...),
    current_session: Session = Depends(get_current_session),
):
    client = FhirClient(current_session.fhir_access_token)
    data = await fhir_resources.get_observations(
        client, current_session.fhir_patient_id, category
    )
    return {"observations": data}


@router.get("/care-plan")
async def get_care_plan(current_session: Session = Depends(get_current_session)):
    client = FhirClient(current_session.fhir_access_token)
    data = await fhir_resources.get_care_plan(client, current_session.fhir_patient_id)
    return {"care_plans": data}


@router.get("/encounters")
async def get_encounters(current_session: Session = Depends(get_current_session)):
    client = FhirClient(current_session.fhir_access_token)
    data = await fhir_resources.get_encounters(client, current_session.fhir_patient_id)
    return {"encounters": data}
