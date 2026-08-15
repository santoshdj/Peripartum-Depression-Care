"""Add forum tables for Mom Talk peer support

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-11
"""

from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create the enum type if it doesn't exist (using raw SQL for async compatibility)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE moderation_status_enum AS ENUM ('pending', 'approved', 'rejected', 'flagged');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    moderation_status_enum = sa.Enum("pending", "approved", "rejected", "flagged", name="moderation_status_enum", create_type=False)
    
    # Create forum_posts table
    op.create_table(
        "forum_posts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("patient_fhir_id", sa.String(256), nullable=False),
        sa.Column("pseudonym", sa.String(50), nullable=False),
        sa.Column("post_content", sa.Text, nullable=False),
        sa.Column(
            "moderation_status",
            moderation_status_enum,
            nullable=False,
            server_default="approved",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_forum_posts_created_at", "forum_posts", ["created_at"])
    op.create_index("ix_forum_posts_patient_fhir_id", "forum_posts", ["patient_fhir_id"])

    # Create forum_replies table (reuse the existing enum)
    op.create_table(
        "forum_replies",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("post_id", sa.String(36), nullable=False),
        sa.Column("patient_fhir_id", sa.String(256), nullable=False),
        sa.Column("pseudonym", sa.String(50), nullable=False),
        sa.Column("reply_content", sa.Text, nullable=False),
        sa.Column(
            "moderation_status",
            moderation_status_enum,
            nullable=False,
            server_default="approved",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["post_id"], ["forum_posts.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_forum_replies_post_id", "forum_replies", ["post_id"])
    op.create_index("ix_forum_replies_created_at", "forum_replies", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_forum_replies_created_at", table_name="forum_replies")
    op.drop_index("ix_forum_replies_post_id", table_name="forum_replies")
    op.drop_table("forum_replies")

    op.drop_index("ix_forum_posts_patient_fhir_id", table_name="forum_posts")
    op.drop_index("ix_forum_posts_created_at", table_name="forum_posts")
    op.drop_table("forum_posts")

    # Drop enum type if no other tables use it
    op.execute("DROP TYPE IF EXISTS moderation_status_enum")
