from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class LlmAuditLog(Base):
    """Audit record for each Anthropic Claude narrative summary generation.

    Stores only the FHIR patient ID (not name/PHI), token counts, and a
    SHA-256 hash of the prompt for cost tracking and debugging.
    """

    __tablename__ = "llm_audit_log"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    fhir_patient_id: Mapped[str] = mapped_column(String(256), index=True)
    model: Mapped[str] = mapped_column(String(128))
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    prompt_hash: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
