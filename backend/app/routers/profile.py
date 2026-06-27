from fastapi import APIRouter, Depends

from app.middleware.session import get_current_session
from app.models.session import Session
from app.services.fhir_client import FhirClient
from app.services import fhir_resources

router = APIRouter(prefix="/api/profile", tags=["profile"])


def _parse_name(patient: dict) -> str:
    names = patient.get("name", [])
    # Prefer official name, fall back to first entry
    official = next((n for n in names if n.get("use") == "official"), names[0] if names else {})
    if official.get("text"):
        return official["text"]
    given = " ".join(official.get("given", []))
    family = official.get("family", "")
    return f"{given} {family}".strip() or "Unknown"


def _parse_telecom(patient: dict) -> dict:
    result: dict = {}
    for t in patient.get("telecom", []):
        system = t.get("system")
        value = t.get("value")
        if system and value and system not in result:
            result[system] = value
    return result


def _parse_address(patient: dict) -> str | None:
    addresses = patient.get("address", [])
    if not addresses:
        return None
    addr = next((a for a in addresses if a.get("use") == "home"), addresses[0])
    parts = []
    parts.extend(addr.get("line", []))
    if addr.get("city"):
        parts.append(addr["city"])
    if addr.get("state"):
        parts.append(addr["state"])
    if addr.get("postalCode"):
        parts.append(addr["postalCode"])
    return ", ".join(parts) if parts else None


@router.get("")
async def get_profile(current_session: Session = Depends(get_current_session)):
    """Returns structured patient demographics from the FHIR Patient resource."""
    client = FhirClient(current_session.fhir_access_token)
    patient = await fhir_resources.get_patient(client, current_session.fhir_patient_id)

    telecom = _parse_telecom(patient)

    return {
        "patient_id": current_session.fhir_patient_id,
        "name": _parse_name(patient),
        "birth_date": patient.get("birthDate"),
        "gender": patient.get("gender"),
        "phone": telecom.get("phone"),
        "email": telecom.get("email"),
        "address": _parse_address(patient),
        "session_expires_at": current_session.expires_at.isoformat(),
        "mrn": next(
            (
                i.get("value")
                for i in patient.get("identifier", [])
                if "MR" in str(i.get("type", {}).get("coding", [{}])[0].get("code", ""))
                or "MRN" in str(i.get("type", {}).get("text", "")).upper()
            ),
            None,
        ),
    }
