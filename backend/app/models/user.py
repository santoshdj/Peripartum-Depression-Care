from datetime import datetime, timezone

from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    """Patient user preferences and pseudonym for Mom Talk forum.
    
    Primary key is FHIR patient ID (one user record per patient).
    Language preference supports multilingual UI (Phase 2, see ADR 0004).
    Pseudonym is unique across all patients (enforced by DB constraint).
    """

    __tablename__ = "users"

    fhir_patient_id: Mapped[str] = mapped_column(String(256), primary_key=True)
    language_preference: Mapped[str] = mapped_column(
        String(5), nullable=False, default="en"
    )  # ISO 639-1 code (en, es)
    pseudonym: Mapped[str | None] = mapped_column(
        String(50), nullable=True, unique=True, index=True
    )  # Created on first Mom Talk visit
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
