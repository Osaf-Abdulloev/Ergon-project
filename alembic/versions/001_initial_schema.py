"""initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-08-01 22:28:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Users Table
    op.create_table(
        'users',
        sa.Column('id', sa.CHAR(length=36), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('username', sa.String(length=100), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=True),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('avatar_url', sa.String(length=512), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('is_email_verified', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('username')
    )

    # 2. Companies Table
    op.create_table(
        'companies',
        sa.Column('id', sa.CHAR(length=36), nullable=False),
        sa.Column('employer_id', sa.CHAR(length=36), nullable=False),
        sa.Column('company_name', sa.String(length=255), nullable=False),
        sa.Column('industry', sa.String(length=100), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('website', sa.String(length=255), nullable=True),
        sa.Column('logo_url', sa.String(length=512), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['employer_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('employer_id')
    )

    # 3. Jobs Table
    op.create_table(
        'jobs',
        sa.Column('id', sa.CHAR(length=36), nullable=False),
        sa.Column('company_id', sa.CHAR(length=36), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('salary_min', sa.Float(), nullable=True),
        sa.Column('salary_max', sa.Float(), nullable=True),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='TJS'),
        sa.Column('location', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('employment_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='OPEN'),
        sa.Column('is_external', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('external_source', sa.String(length=50), nullable=True),
        sa.Column('external_id', sa.String(length=100), nullable=True),
        sa.Column('external_url', sa.String(length=512), nullable=True),
        sa.Column('external_company_name', sa.String(length=255), nullable=True),
        sa.Column('external_company_logo', sa.String(length=512), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 4. Applications Table
    op.create_table(
        'applications',
        sa.Column('id', sa.CHAR(length=36), nullable=False),
        sa.Column('job_id', sa.CHAR(length=36), nullable=False),
        sa.Column('worker_id', sa.CHAR(length=36), nullable=False),
        sa.Column('cover_letter', sa.Text(), nullable=True),
        sa.Column('cover_note', sa.Text(), nullable=True),
        sa.Column('resume_url', sa.String(length=512), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='PENDING'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['worker_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('job_id', 'worker_id', name='uq_job_worker_application')
    )

    # 5. Chats Table
    op.create_table(
        'chats',
        sa.Column('id', sa.CHAR(length=36), nullable=False),
        sa.Column('job_id', sa.CHAR(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # 6. Messages Table
    op.create_table(
        'messages',
        sa.Column('id', sa.CHAR(length=36), nullable=False),
        sa.Column('chat_id', sa.CHAR(length=36), nullable=False),
        sa.Column('sender_id', sa.CHAR(length=36), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False, server_default='TEXT'),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['chat_id'], ['chats.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('messages')
    op.drop_table('chats')
    op.drop_table('applications')
    op.drop_table('jobs')
    op.drop_table('companies')
    op.drop_table('users')
