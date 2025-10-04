"""add_compound_indexes_to_models

Revision ID: 122b81ebc3d7
Revises: consolidated_001
Create Date: 2025-10-02 16:36:20.672126

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '122b81ebc3d7'
down_revision: Union[str, Sequence[str], None] = 'consolidated_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add compound indexes for better query performance."""
    # Add compound index on RevokedToken (token, expires_at)
    op.create_index(
        'ix_revokedtoken_token_expires',
        'revokedtoken',
        ['token', 'expires_at'],
        unique=False
    )
    
    # Add compound index on Message (user_id, session_id, created_at)
    op.create_index(
        'ix_message_user_session_created',
        'message',
        ['user_id', 'session_id', 'created_at'],
        unique=False
    )


def downgrade() -> None:
    """Remove compound indexes."""
    op.drop_index('ix_message_user_session_created', table_name='message')
    op.drop_index('ix_revokedtoken_token_expires', table_name='revokedtoken')
