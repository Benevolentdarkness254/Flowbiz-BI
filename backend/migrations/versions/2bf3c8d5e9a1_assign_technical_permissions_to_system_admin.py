"""Assign technical permissions to system admin role

Revision ID: 2bf3c8d5e9a1
Revises: 1ae3678e91f7
Create Date: 2026-04-12 10:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "2bf3c8d5e9a1"
down_revision = "1ae3678e91f7"
branch_labels = None
depends_on = None


def upgrade():
    # Assign only technical/system permissions to system_admin role
    # Business permissions (sales, inventory, deliveries, POs, receipts, reports)
    # are intentionally excluded - system_admin should not have access to business data.
    op.execute("""
        INSERT IGNORE INTO role_permissions (role_id, permission_id)
        SELECT r.role_id, p.permission_id
        FROM roles r
        CROSS JOIN permissions p
        WHERE r.role_name = 'system_admin'
        AND p.permission_key IN (
            'user.create',
            'user.edit',
            'user.view',
            'user.delete',
            'system.backup',
            'system.config',
            'system.audit',
            'system.logs'
        )
    """)


def downgrade():
    # Remove technical permissions from system_admin role
    op.execute("""
        DELETE rp FROM role_permissions rp
        INNER JOIN roles r ON r.role_id = rp.role_id
        INNER JOIN permissions p ON p.permission_id = rp.permission_id
        WHERE r.role_name = 'system_admin'
        AND p.permission_key IN (
            'user.create',
            'user.edit',
            'user.view',
            'user.delete',
            'system.backup',
            'system.config',
            'system.audit',
            'system.logs'
        )
    """)
