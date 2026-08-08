"""add_resumes_table

Revision ID: a1b2c3d4e5f6
Revises: e8bba9138216
Create Date: 2026-08-06 21:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '97df4d20ef14'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'resumes' not in tables:
        op.create_table('resumes',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('user_id', sa.UUID(), nullable=False),
            sa.Column('source_file_id', sa.UUID(), nullable=True),
            sa.Column('title', sa.String(length=255), nullable=False),
            sa.Column('target_position', sa.String(length=255), nullable=True),
            sa.Column('status', sa.String(length=50), nullable=False),
            sa.Column('content', sa.JSON(), nullable=False),
            sa.Column('ai_suggestions', sa.JSON(), nullable=True),
            sa.Column('completeness_score', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('is_published', sa.Boolean(), nullable=False, server_default='0'),
            sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['source_file_id'], ['file_uploads.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_resumes_user_id'), 'resumes', ['user_id'], unique=False)
        op.create_index(op.f('ix_resumes_target_position'), 'resumes', ['target_position'], unique=False)
        op.create_index(op.f('ix_resumes_status'), 'resumes', ['status'], unique=False)
        op.create_index(op.f('ix_resumes_is_published'), 'resumes', ['is_published'], unique=False)

def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()
    if 'resumes' in tables:
        op.drop_table('resumes')
