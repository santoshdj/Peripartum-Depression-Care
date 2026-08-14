"""Add provider column to auth_states

Revision ID: 0007
Revises: 0006
Create Date: 2026-08-13
"""

from alembic import op
import sqlalchemy as sa

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add provider column to track which EHR provider was selected
    op.add_column(
        "auth_states",
        sa.Column("provider", sa.String(50), nullable=False, server_default="epic"),
    )


def downgrade() -> None:
    op.drop_column("auth_states", "provider")
