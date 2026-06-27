"""Add journal_entries table

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-23
"""

from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "journal_entries",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("patient_fhir_id", sa.String(256), nullable=False),
        sa.Column("mood_score", sa.SmallInteger, nullable=False),
        sa.Column("sleep_hours", sa.SmallInteger, nullable=False),
        sa.Column("anxiety_score", sa.SmallInteger, nullable=False),
        sa.Column("note", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_journal_entries_patient_fhir_id", "journal_entries", ["patient_fhir_id"])


def downgrade() -> None:
    op.drop_index("ix_journal_entries_patient_fhir_id", table_name="journal_entries")
    op.drop_table("journal_entries")
