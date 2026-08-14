"""Add diary sharing columns to journal_entries

Revision ID: 0006
Revises: 0005
Create Date: 2026-08-11
"""

from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add columns for FHIR Observation write-back tracking
    op.add_column(
        "journal_entries",
        sa.Column("shared_to_fhir", sa.Boolean, nullable=False, server_default="false"),
    )
    op.add_column(
        "journal_entries",
        sa.Column("fhir_observation_id", sa.String(256), nullable=True),
    )
    op.add_column(
        "journal_entries",
        sa.Column("shared_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Add index for querying shared entries
    op.create_index(
        "ix_journal_entries_shared_to_fhir",
        "journal_entries",
        ["patient_fhir_id", "shared_to_fhir"],
    )


def downgrade() -> None:
    op.drop_index("ix_journal_entries_shared_to_fhir", table_name="journal_entries")
    op.drop_column("journal_entries", "shared_at")
    op.drop_column("journal_entries", "fhir_observation_id")
    op.drop_column("journal_entries", "shared_to_fhir")
