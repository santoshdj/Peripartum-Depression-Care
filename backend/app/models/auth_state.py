from datetime import datetime, timezone

from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AuthState(Base):
    """Short-lived PKCE state stored during SMART authorization flow."""

    __tablename__ = "auth_states"

    state: Mapped[str] = mapped_column(String(256), primary_key=True)
    code_verifier: Mapped[str] = mapped_column(String(256))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
