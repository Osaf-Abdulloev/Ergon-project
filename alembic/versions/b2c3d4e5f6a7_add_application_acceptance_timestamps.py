"""add_application_acceptance_timestamps

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-08-15 16:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = '02e8ce7adb94'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [c['name'] for c in inspector.get_columns('applications')]
    
    if 'accepted_at' not in columns:
        op.add_column('applications', sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True))
    if 'rejected_at' not in columns:
        op.add_column('applications', sa.Column('rejected_at', sa.DateTime(timezone=True), nullable=True))

def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [c['name'] for c in inspector.get_columns('applications')]
    
    if 'accepted_at' in columns:
        op.drop_column('applications', 'accepted_at')
    if 'rejected_at' in columns:
        op.drop_column('applications', 'rejected_at')
