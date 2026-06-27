import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

from app.models.session import Session


async def _make_session(db_session) -> Session:
    session = Session(
        fhir_access_token="test_fhir_token",
        fhir_patient_id="patient-test-123",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db_session.add(session)
    await db_session.flush()
    return session


@pytest.mark.asyncio
async def test_get_questionnaire_returns_ten_questions(client):
    response = await client.get("/api/screening/questionnaire")
    assert response.status_code == 200
    data = response.json()
    assert len(data["questions"]) == 10


@pytest.mark.asyncio
async def test_get_questionnaire_question_structure(client):
    response = await client.get("/api/screening/questionnaire")
    question = response.json()["questions"][0]
    assert "id" in question
    assert "text" in question
    assert "options" in question
    assert len(question["options"]) == 4


@pytest.mark.asyncio
async def test_submit_screening_without_session_returns_401(client):
    response = await client.post(
        "/api/screening/submit",
        json={"responses": {i: 0 for i in range(1, 11)}},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_submit_screening_scores_correctly(client, db_session):
    session = await _make_session(db_session)

    mock_fhir_client = AsyncMock()
    mock_fhir_client.post.side_effect = [
        {"resourceType": "QuestionnaireResponse", "id": "qr-001"},
        {"resourceType": "Observation", "id": "obs-001"},
    ]

    with patch("app.routers.screening.FhirClient", return_value=mock_fhir_client):
        response = await client.post(
            "/api/screening/submit",
            json={"responses": {i: 1 for i in range(1, 11)}},
            cookies={"session_id": session.id},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["score"] == 10
    assert data["risk"] == "elevated"
    assert data["threshold"] == 10
    assert data["fhir_observation_id"] == "obs-001"


@pytest.mark.asyncio
async def test_submit_screening_normal_score(client, db_session):
    session = await _make_session(db_session)

    mock_fhir_client = AsyncMock()
    mock_fhir_client.post.side_effect = [
        {"resourceType": "QuestionnaireResponse", "id": "qr-002"},
        {"resourceType": "Observation", "id": "obs-002"},
    ]

    with patch("app.routers.screening.FhirClient", return_value=mock_fhir_client):
        response = await client.post(
            "/api/screening/submit",
            json={"responses": {i: 0 for i in range(1, 11)}},
            cookies={"session_id": session.id},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["score"] == 0
    assert data["risk"] == "normal"
