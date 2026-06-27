import pytest

from app.services.epds_service import (
    EPDS_QUESTIONS,
    RISK_THRESHOLD,
    assess_risk,
    calculate_score,
)


def test_questionnaire_has_ten_questions():
    assert len(EPDS_QUESTIONS) == 10


def test_all_questions_have_four_options():
    for q in EPDS_QUESTIONS:
        assert len(q["options"]) == 4, f"Question {q['id']} does not have 4 options"


def test_calculate_score_zero():
    responses = {q["id"]: 0 for q in EPDS_QUESTIONS}
    assert calculate_score(responses) == 0


def test_calculate_score_maximum():
    responses = {q["id"]: 3 for q in EPDS_QUESTIONS}
    assert calculate_score(responses) == 30


def test_calculate_score_at_threshold():
    responses = {i: 1 for i in range(1, 11)}
    assert calculate_score(responses) == 10


def test_assess_risk_normal_below_threshold():
    result = assess_risk(RISK_THRESHOLD - 1)
    assert result.risk == "normal"
    assert result.score == RISK_THRESHOLD - 1


def test_assess_risk_elevated_at_threshold():
    result = assess_risk(RISK_THRESHOLD)
    assert result.risk == "elevated"


def test_assess_risk_elevated_above_threshold():
    result = assess_risk(25)
    assert result.risk == "elevated"
    assert result.score == 25


def test_assess_risk_zero_is_normal():
    result = assess_risk(0)
    assert result.risk == "normal"


def test_elevated_message_contains_hotline():
    result = assess_risk(15)
    assert "1-833-943-5746" in result.message


def test_elevated_message_mentions_care_team():
    result = assess_risk(10)
    assert "care team" in result.message.lower()


def test_normal_message_does_not_contain_hotline():
    result = assess_risk(5)
    assert "1-833-943-5746" not in result.message


@pytest.mark.parametrize("score,expected_risk", [
    (0, "normal"),
    (9, "normal"),
    (10, "elevated"),
    (11, "elevated"),
    (30, "elevated"),
])
def test_risk_threshold_boundary(score: int, expected_risk: str):
    assert assess_risk(score).risk == expected_risk
