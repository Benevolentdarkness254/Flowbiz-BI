"""Remove business permissions from sys admin role

Revision ID: 1ae3678e91f7
Revises: ffc3d10800e7
Create Date: 2026-03-26 17:30:46.630125

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "1ae3678e91f7"
down_revision = "ffc3d10800e7"
branch_labels = None
depends_on = None


def upgrade():
    # Remove business permissions from sys_admin role, keeping only technical/IT permissions
    op.execute("""
        DELETE FROM role_permissions 
        WHERE role_id = (SELECT role_id FROM roles WHERE role_name = 'system_admin')
        AND permission_id IN (
            SELECT p.permission_id FROM permissions p 
            WHERE p.module IN ('delivery', 'receipts', 'sales', 'inventory', 'purchases', 'finance')
        )
    """)


def downgrade():
    # Note: Downgrade would re-assign all permissions to sys_admin role
    # This is complex to implement perfectly without tracking original state
    # For simplicity, we'll document that downgrade would require manual intervention
    pass
