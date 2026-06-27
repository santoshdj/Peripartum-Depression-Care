"""Add weekly_summaries table

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-23
"""

from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "weekly_summaries",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("patient_fhir_id", sa.String(256), nullable=False),
        sa.Column("week_start_date", sa.Date, nullable=False),
        sa.Column("summary_text", sa.Text, nullable=False),
        sa.Column("entry_count", sa.Integer, nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_weekly_summaries_patient_week",
        "weekly_summaries",
        ["patient_fhir_id", "week_start_date"],
    )


def downgrade() -> None:
    op.drop_index("ix_weekly_summaries_patient_week", table_name="weekly_summaries")
    op.drop_table("weekly_summaries")
