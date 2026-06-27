import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

from app.models.session import Session


@pytest.mark.asyncio
async def test_launch_redirects_to_epic_auth(client):
    response = await client.get("/auth/launch", follow_redirects=False)
    assert response.status_code in (302, 307)
    location = response.headers["location"]
    assert "authorize" in location
    assert "code_challenge" in location
    assert "client_id" in location
    assert "state" in location


@pytest.mark.asyncio
async def test_callback_with_invalid_state_returns_400(client):
    response = await client.get(
        "/auth/callback",
        params={"code": "fake_code", "state": "nonexistent_state"},
        follow_redirects=False,
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_me_without_session_returns_401(client):
    response = await client.get("/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_logout_without_session_returns_401(client):
    response = await client.post("/auth/logout")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_with_valid_session(client, db_session):
    session = Session(
        fhir_access_token="tok",
        fhir_patient_id="patient-001",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db_session.add(session)
    await db_session.flush()

    response = await client.get("/auth/me", cookies={"session_id": session.id})
    assert response.status_code == 200
    data = response.json()
    assert data["patient_id"] == "patient-001"


@pytest.mark.asyncio
async def test_me_with_expired_session_returns_401(client, db_session):
    session = Session(
        fhir_access_token="tok",
        fhir_patient_id="patient-002",
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
    )
    db_session.add(session)
    await db_session.flush()

    response = await client.get("/auth/me", cookies={"session_id": session.id})
    assert response.status_code == 401
