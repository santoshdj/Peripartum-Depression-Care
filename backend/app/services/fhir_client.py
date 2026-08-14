import httpx
from fastapi import HTTPException

from app.utils.config import settings


class FhirClient:
    """Async FHIR R4 HTTP client scoped to a single patient session.
    
    Compatible with any FHIR R4-compliant EHR (Epic, Cerner, Allscripts, etc.).
    """

    def __init__(self, access_token: str) -> None:
        self._access_token = access_token
        self._base_url = settings.FHIR_BASE_URL.rstrip("/")

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self._access_token}",
            "Accept": "application/fhir+json",
        }

    async def get(self, path: str, params: dict | None = None) -> dict:
        url = f"{self._base_url}/{path.lstrip('/')}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=self._headers(), params=params or {})
        if response.status_code == 401:
            raise HTTPException(status_code=401, detail="FHIR token expired or invalid")
        if not response.is_success:
            raise HTTPException(
                status_code=502,
                detail=f"FHIR server error: {response.status_code}",
            )
        return response.json()

    async def post(self, path: str, resource: dict) -> dict:
        url = f"{self._base_url}/{path.lstrip('/')}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                url,
                headers={**self._headers(), "Content-Type": "application/fhir+json"},
                json=resource,
            )
        if not response.is_success:
            raise HTTPException(
                status_code=502,
                detail=f"FHIR write failed: {response.status_code}",
            )
        return response.json()

    @staticmethod
    def extract_bundle_entries(bundle: dict) -> list[dict]:
        """Extracts resource dicts from a FHIR Bundle response."""
        return [
            entry["resource"]
            for entry in bundle.get("entry", [])
            if "resource" in entry
        ]
