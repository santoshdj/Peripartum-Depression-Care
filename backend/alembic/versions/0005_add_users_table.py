"""Add users table for multilingual support and pseudonyms

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-11
"""

from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("fhir_patient_id", sa.String(256), primary_key=True),
        sa.Column("language_preference", sa.String(5), nullable=False, server_default="en"),
        sa.Column("pseudonym", sa.String(50), nullable=True, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_pseudonym", "users", ["pseudonym"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_pseudonym", table_name="users")
    op.drop_table("users")
