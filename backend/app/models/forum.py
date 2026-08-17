import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ModerationStatus(str, Enum):
    """Content moderation status for Mom Talk posts and replies."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FLAGGED = "flagged"


class ForumPost(Base):
    """Mom Talk discussion thread. Anonymous peer support forum for peripartum patients.
    
    Pseudonyms hide real names (FHIR Patient.name never exposed).
    AI content moderation filters harmful keywords (suicide, self-harm, violence).
    See CONTEXT.md: Mom Talk
    """

    __tablename__ = "forum_posts"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    patient_fhir_id: Mapped[str] = mapped_column(String(256), nullable=False, index=True)
    pseudonym: Mapped[str] = mapped_column(String(50), nullable=False)
    post_content: Mapped[str] = mapped_column(Text, nullable=False)
    moderation_status: Mapped[ModerationStatus] = mapped_column(
        String(20),
        nullable=False,
        default=ModerationStatus.APPROVED,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    # Relationship to replies
    replies: Mapped[list["ForumReply"]] = relationship(
        "ForumReply",
        back_populates="post",
        cascade="all, delete-orphan",
    )


class ForumReply(Base):
    """Reply to a Mom Talk forum post. Same pseudonym + moderation rules as ForumPost."""

    __tablename__ = "forum_replies"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    post_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("forum_posts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    patient_fhir_id: Mapped[str] = mapped_column(String(256), nullable=False)
    pseudonym: Mapped[str] = mapped_column(String(50), nullable=False)
    reply_content: Mapped[str] = mapped_column(Text, nullable=False)
    moderation_status: Mapped[ModerationStatus] = mapped_column(
        String(20),
        nullable=False,
        default=ModerationStatus.APPROVED,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    # Relationship to parent post
    post: Mapped["ForumPost"] = relationship("ForumPost", back_populates="replies")
