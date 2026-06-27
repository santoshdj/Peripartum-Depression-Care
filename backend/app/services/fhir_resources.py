from datetime import datetime, timezone

from app.services.fhir_client import FhirClient


async def get_patient(client: FhirClient, patient_id: str) -> dict:
    return await client.get(f"Patient/{patient_id}")


async def get_conditions(client: FhirClient, patient_id: str) -> list[dict]:
    bundle = await client.get(
        "Condition",
        params={
            "patient": patient_id,
            "clinical-status": "active",
            "_sort": "-onset-date",
        },
    )
    return client.extract_bundle_entries(bundle)


async def get_medications(client: FhirClient, patient_id: str) -> list[dict]:
    bundle = await client.get(
        "MedicationRequest",
        params={
            "patient": patient_id,
            "_sort": "-authoredon",
            "_count": "50",
        },
    )
    return client.extract_bundle_entries(bundle)


async def get_appointments(client: FhirClient, patient_id: str) -> list[dict]:
    today = datetime.now(timezone.utc).date().isoformat()
    bundle = await client.get(
        "Appointment",
        params={
            "patient": patient_id,
            "date": f"ge{today}",
            "_sort": "date",
            "_count": "10",
        },
    )
    return client.extract_bundle_entries(bundle)


async def get_observations(
    client: FhirClient,
    patient_id: str,
    category: str,
    count: int = 100,
) -> list[dict]:
    bundle = await client.get(
        "Observation",
        params={
            "patient": patient_id,
            "category": category,
            "_sort": "-date",
            "_count": str(count),
        },
    )
    return client.extract_bundle_entries(bundle)


async def get_epds_observations(client: FhirClient, patient_id: str) -> list[dict]:
    bundle = await client.get(
        "Observation",
        params={
            "patient": patient_id,
            "code": "89049-6",
            "_sort": "-date",
            "_count": "50",
        },
    )
    return client.extract_bundle_entries(bundle)


async def get_encounters(client: FhirClient, patient_id: str) -> list[dict]:
    bundle = await client.get(
        "Encounter",
        params={
            "patient": patient_id,
            "_sort": "-date",
            "_count": "20",
        },
    )
    return client.extract_bundle_entries(bundle)


async def get_care_plan(client: FhirClient, patient_id: str) -> list[dict]:
    bundle = await client.get(
        "CarePlan",
        params={"patient": patient_id, "status": "active", "_sort": "-date"},
    )
    return client.extract_bundle_entries(bundle)


async def submit_epds(
    client: FhirClient,
    patient_id: str,
    responses: dict[int, int],
    score: int,
) -> tuple[str, str]:
    """Writes QuestionnaireResponse + Observation to EPIC.

    Returns (questionnaire_response_id, observation_id).
    """
    now = datetime.now(timezone.utc).isoformat()
    patient_ref = f"Patient/{patient_id}"

    items = [
        {"linkId": str(q_num), "answer": [{"valueInteger": value}]}
        for q_num, value in responses.items()
    ]
    qr_resource = {
        "resourceType": "QuestionnaireResponse",
        "questionnaire": "http://loinc.org/89049-6",
        "status": "completed",
        "subject": {"reference": patient_ref},
        "authored": now,
        "item": items,
    }
    qr_result = await client.post("QuestionnaireResponse", qr_resource)
    qr_id = qr_result.get("id", "")

    obs_resource = {
        "resourceType": "Observation",
        "status": "final",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                        "code": "survey",
                        "display": "Survey",
                    }
                ]
            }
        ],
        "code": {
            "coding": [
                {
                    "system": "http://loinc.org",
                    "code": "89049-6",
                    "display": "Edinburgh Postnatal Depression Scale total score",
                }
            ]
        },
        "subject": {"reference": patient_ref},
        "effectiveDateTime": now,
        "valueInteger": score,
        "derivedFrom": [{"reference": f"QuestionnaireResponse/{qr_id}"}],
    }
    obs_result = await client.post("Observation", obs_resource)
    obs_id = obs_result.get("id", "")

    return qr_id, obs_id
