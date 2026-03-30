"""Add system and additional permissions

Revision ID: ffc3d10800e7
Revises: 8dfe900b00ed
Create Date: 2026-03-26 17:02:29.377252

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "ffc3d10800e7"
down_revision = "8dfe900b00ed"
branch_labels = None
depends_on = None


def upgrade():
    # Add system permissions - use INSERT IGNORE to avoid duplicates
    op.execute("""
        INSERT IGNORE INTO permissions (module, permission_key, description) VALUES
        ('system', 'system.backup', 'Trigger data backups'),
        ('system', 'system.config', 'Configure system settings');
    """)

    # Additional permissions from permission_updates.sql - use INSERT IGNORE to avoid duplicates
    op.execute("""
        INSERT IGNORE INTO permissions (module, permission_key, description) VALUES
        ('system', 'system.logs', 'View system and error logs'),
        ('system', 'system.audit', 'View audit trail and user activity'),
        ('system', 'system.health', 'View system health and metrics'),
        ('delivery', 'delivery.view', 'View deliveries'),
        ('delivery', 'delivery.update', 'Update delivery status'),
        ('receipts', 'receipt.view', 'View receipts'),
        ('receipts', 'receipt.create', 'Create and issue receipts');
    """)


def downgrade():
    # Remove the added permissions
    op.execute("""
        DELETE FROM permissions 
        WHERE permission_key IN (
            'system.backup', 'system.config',
            'system.logs', 'system.audit', 'system.health',
            'delivery.view', 'delivery.update',
            'receipt.view', 'receipt.create'
        )
    """)
