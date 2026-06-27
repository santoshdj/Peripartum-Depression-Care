"""Edinburgh Postnatal Depression Scale — questionnaire definition, scoring, risk assessment."""

from dataclasses import dataclass

EPDS_QUESTIONS = [
    {
        "id": 1,
        "text": "I have been able to laugh and see the funny side of things",
        "options": [
            {"value": 0, "label": "As much as I always could"},
            {"value": 1, "label": "Not quite so much now"},
            {"value": 2, "label": "Definitely not so much now"},
            {"value": 3, "label": "Not at all"},
        ],
    },
    {
        "id": 2,
        "text": "I have looked forward with enjoyment to things",
        "options": [
            {"value": 0, "label": "As much as I ever did"},
            {"value": 1, "label": "Rather less than I used to"},
            {"value": 2, "label": "Definitely less than I used to"},
            {"value": 3, "label": "Hardly at all"},
        ],
    },
    {
        "id": 3,
        "text": "I have blamed myself unnecessarily when things went wrong",
        "options": [
            {"value": 3, "label": "Yes, most of the time"},
            {"value": 2, "label": "Yes, some of the time"},
            {"value": 1, "label": "Not very often"},
            {"value": 0, "label": "No, never"},
        ],
    },
    {
        "id": 4,
        "text": "I have been anxious or worried for no good reason",
        "options": [
            {"value": 0, "label": "No, not at all"},
            {"value": 1, "label": "Hardly ever"},
            {"value": 2, "label": "Yes, sometimes"},
            {"value": 3, "label": "Yes, very often"},
        ],
    },
    {
        "id": 5,
        "text": "I have felt scared or panicky for no very good reason",
        "options": [
            {"value": 3, "label": "Yes, quite a lot"},
            {"value": 2, "label": "Yes, sometimes"},
            {"value": 1, "label": "No, not much"},
            {"value": 0, "label": "No, not at all"},
        ],
    },
    {
        "id": 6,
        "text": "Things have been getting on top of me",
        "options": [
            {"value": 3, "label": "Yes, most of the time I haven't been able to cope at all"},
            {"value": 2, "label": "Yes, sometimes I haven't been coping as well as usual"},
            {"value": 1, "label": "No, most of the time I have coped quite well"},
            {"value": 0, "label": "No, I have been coping as well as ever"},
        ],
    },
    {
        "id": 7,
        "text": "I have been so unhappy that I have had difficulty sleeping",
        "options": [
            {"value": 3, "label": "Yes, most of the time"},
            {"value": 2, "label": "Yes, sometimes"},
            {"value": 1, "label": "Not very often"},
            {"value": 0, "label": "No, not at all"},
        ],
    },
    {
        "id": 8,
        "text": "I have felt sad or miserable",
        "options": [
            {"value": 3, "label": "Yes, most of the time"},
            {"value": 2, "label": "Yes, quite often"},
            {"value": 1, "label": "Not very often"},
            {"value": 0, "label": "No, not at all"},
        ],
    },
    {
        "id": 9,
        "text": "I have been so unhappy that I have been crying",
        "options": [
            {"value": 3, "label": "Yes, most of the time"},
            {"value": 2, "label": "Yes, quite often"},
            {"value": 1, "label": "Only occasionally"},
            {"value": 0, "label": "No, never"},
        ],
    },
    {
        "id": 10,
        "text": "The thought of harming myself has occurred to me",
        "options": [
            {"value": 3, "label": "Yes, quite often"},
            {"value": 2, "label": "Sometimes"},
            {"value": 1, "label": "Hardly ever"},
            {"value": 0, "label": "Never"},
        ],
    },
]

RISK_THRESHOLD = 10


@dataclass
class EpdsResult:
    score: int
    risk: str  # "elevated" | "normal"
    message: str


def calculate_score(responses: dict[int, int]) -> int:
    """Sum submitted score values. Each value is already the scored integer (0-3)."""
    return sum(responses.values())


def assess_risk(score: int) -> EpdsResult:
    if score >= RISK_THRESHOLD:
        return EpdsResult(
            score=score,
            risk="elevated",
            message=(
                "Your score suggests you may be experiencing symptoms of peripartum depression. "
                "Please reach out to your care team as soon as possible. "
                "If you need immediate support, call the National Maternal Mental Health Hotline: "
                "1-833-943-5746 (free, 24/7, English & Spanish)."
            ),
        )
    return EpdsResult(
        score=score,
        risk="normal",
        message=(
            "Your score is within the normal range. It's still important to check in with your "
            "care team at your next visit and to keep monitoring your wellbeing."
        ),
    )
