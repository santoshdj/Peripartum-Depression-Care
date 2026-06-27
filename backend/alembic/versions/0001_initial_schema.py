"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-21
"""

from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "auth_states",
        sa.Column("state", sa.String(256), primary_key=True),
        sa.Column("code_verifier", sa.String(256), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("fhir_access_token", sa.String(4096), nullable=False),
        sa.Column("fhir_patient_id", sa.String(256), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "epds_cache",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("fhir_patient_id", sa.String(256), nullable=False, index=True),
        sa.Column("score", sa.Integer, nullable=False),
        sa.Column("fhir_observation_id", sa.String(256), nullable=True),
        sa.Column("fhir_questionnaire_response_id", sa.String(256), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_epds_cache_fhir_patient_id", "epds_cache", ["fhir_patient_id"])

    op.create_table(
        "llm_audit_log",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("fhir_patient_id", sa.String(256), nullable=False),
        sa.Column("model", sa.String(128), nullable=False),
        sa.Column("prompt_tokens", sa.Integer, nullable=False, server_default="0"),
        sa.Column("completion_tokens", sa.Integer, nullable=False, server_default="0"),
        sa.Column("prompt_hash", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_llm_audit_log_fhir_patient_id", "llm_audit_log", ["fhir_patient_id"])


def downgrade() -> None:
    op.drop_table("llm_audit_log")
    op.drop_table("epds_cache")
    op.drop_table("sessions")
    op.drop_table("auth_states")
