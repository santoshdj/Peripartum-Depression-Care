import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.summary_service import _build_prompt, generate_narrative_summary


def test_build_prompt_includes_patient_name():
    context = {
        "patient": {"name": "Jane Doe"},
        "conditions": [{"display": "Postpartum depression"}],
        "medications": [{"display": "Sertraline 50mg"}],
        "appointments": [],
        "latest_epds": 12,
    }
    prompt = _build_prompt(context)
    assert "Jane Doe" in prompt
    assert "12" in prompt
    assert "Postpartum depression" in prompt
    assert "Sertraline 50mg" in prompt


def test_build_prompt_handles_no_epds():
    context = {
        "patient": {"name": "Test Patient"},
        "conditions": [],
        "medications": [],
        "appointments": [],
        "latest_epds": None,
    }
    prompt = _build_prompt(context)
    assert "No EPDS screenings on record" in prompt


def test_build_prompt_limits_to_five_conditions():
    context = {
        "patient": {"name": "Test"},
        "conditions": [{"display": f"Condition {i}"} for i in range(10)],
        "medications": [],
        "appointments": [],
        "latest_epds": None,
    }
    prompt = _build_prompt(context)
    # Only first 5 conditions should appear
    assert "Condition 4" in prompt
    assert "Condition 5" not in prompt


@pytest.mark.asyncio
async def test_generate_narrative_summary_returns_text_and_logs():
    mock_db = AsyncMock()
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="You are managing well.")]
    mock_response.usage.input_tokens = 120
    mock_response.usage.output_tokens = 55

    context = {
        "patient": {"name": "Test Patient"},
        "conditions": [],
        "medications": [],
        "appointments": [],
        "latest_epds": 5,
    }

    with patch("app.services.summary_service._client") as mock_client:
        mock_client.messages.create = AsyncMock(return_value=mock_response)
        result = await generate_narrative_summary(context, "patient-abc", mock_db)

    assert result == "You are managing well."
    mock_db.add.assert_called_once()


@pytest.mark.asyncio
async def test_generate_narrative_summary_raises_502_on_api_error():
    from fastapi import HTTPException

    mock_db = AsyncMock()
    context = {
        "patient": {"name": "Test"},
        "conditions": [],
        "medications": [],
        "appointments": [],
        "latest_epds": None,
    }

    with patch("app.services.summary_service._client") as mock_client:
        mock_client.messages.create = AsyncMock(side_effect=Exception("API down"))
        with pytest.raises(HTTPException) as exc_info:
            await generate_narrative_summary(context, "patient-xyz", mock_db)

    assert exc_info.value.status_code == 502
