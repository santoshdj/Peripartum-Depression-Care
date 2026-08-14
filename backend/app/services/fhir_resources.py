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


async def create_provider_alert_task(
    client: FhirClient,
    patient_id: str,
    epds_score: int,
    timestamp: str,
) -> str:
    """
    Creates a FHIR Task resource to alert provider of elevated EPDS score.
    
    Task appears in provider's EPIC "In Basket" with status=requested, priority=urgent.
    See CONTEXT.md: EPDS Risk Threshold
    
    Args:
        client: Authenticated FHIR client
        patient_id: FHIR Patient ID
        epds_score: Total EPDS score (0-30)
        timestamp: ISO 8601 timestamp of screening submission
        
    Returns:
        Task resource ID from EPIC
    """
    patient_ref = f"Patient/{patient_id}"
    
    task_resource = {
        "resourceType": "Task",
        "status": "requested",
        "intent": "order",
        "priority": "urgent",
        "code": {
            "text": "Review peripartum depression screening"
        },
        "description": (
            f"Patient EPDS score: {epds_score} (clinical threshold: 10). "
            f"Submitted: {timestamp}. "
            f"Follow up for peripartum depression assessment and treatment planning."
        ),
        "for": {"reference": patient_ref},
        "authoredOn": timestamp,
        # Note: Task.owner should reference PractitionerRole or Practitioner
        # In MVP, we omit owner to let EPIC assign to patient's care team
        # In production, fetch patient's primary care team and set Task.owner
    }
    
    task_result = await client.post("Task", task_resource)
    task_id = task_result.get("id", "")
    
    return task_id


async def create_diary_observation(
    client: FhirClient,
    patient_id: str,
    entry: dict,
) -> str:
    """
    Writes a diary entry to FHIR as an Observation resource.
    
    Used for patient-controlled diary sharing (ADR 0005).
    
    Args:
        client: Authenticated FHIR client
        patient_id: FHIR Patient ID
        entry: Dict with keys: mood_score, sleep_hours, anxiety_score, note, created_at
        
    Returns:
        Observation resource ID from EPIC
    """
    patient_ref = f"Patient/{patient_id}"
    
    # Format diary data as structured string
    value_string = (
        f"Mood: {entry['mood_score']}/5 | "
        f"Sleep: {entry['sleep_hours']} hours | "
        f"Anxiety: {entry['anxiety_score']}/5"
    )
    if entry.get("note"):
        value_string += f" | Note: {entry['note']}"
    
    observation_resource = {
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
                    "code": "LA28656-4",
                    "display": "Daily mood and anxiety self-report",
                }
            ]
        },
        "subject": {"reference": patient_ref},
        "effectiveDateTime": entry["created_at"],
        "issued": datetime.now(timezone.utc).isoformat(),
        "valueString": value_string,
    }
    
    obs_result = await client.post("Observation", observation_resource)
    obs_id = obs_result.get("id", "")
    
    return obs_id
