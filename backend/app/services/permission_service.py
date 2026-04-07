# backend/app/services/permission_service.py
"""
Permission seeding and validation service.

Ensures each role has only its intended permissions — no more, no less.
This is the single source of truth for role-to-permission mappings.
If a role needs new permissions, update the ROLE_PERMISSION_MAP below.
"""

from app.extensions import db
from app.models.auth import Role, Permission, RolePermission


# Canonical role-to-permission mappings.
# Each role gets ONLY the permissions listed here.
# system_admin gets ALL permissions automatically.
ROLE_PERMISSION_MAP = {
    "business_owner": [
        "sale.view",
        "sale.refund",
        "customer.manage",
        "inventory.view",
        "delivery.view",
        "po.approve",
        "po.view",
        "report.view",
        "report.generate",
        "receipt.issue",
        "receipt.reprint",
        "receipt.void",
        "system.audit",
        "system.logs",
    ],
    "sales_staff": [
        "sale.create",
        "sale.view",
        "sale.refund",
        "customer.manage",
        "inventory.view",
        "delivery.outbound.view",
        "delivery.outbound.create",
        "delivery.outbound.update",
        "receipt.issue",
        "receipt.reprint",
    ],
    "inventory_staff": [
        "inventory.view",
        "inventory.adjust",
        "delivery.inbound.receive",
        "delivery.inbound.view",
        "delivery.outbound.view",
        "delivery.outbound.create",
        "delivery.view",
        "po.create",
        "po.view",
        "receipt.issue",
        "receipt.reprint",
    ],
    "driver": [
        "delivery.outbound.view",
        "delivery.outbound.update",
        "delivery.view",
    ],
}


def seed_role_permissions():
    """
    Clear all existing role_permissions and re-seed from ROLE_PERMISSION_MAP.
    system_admin is intentionally omitted — it gets ALL permissions dynamically
    via the admin bypass in the permission decorator and usePermission hook.
    """
    # Clear existing mappings
    RolePermission.query.delete()
    db.session.commit()

    # Look up all permission keys by their string values
    all_perms = {p.permission_key: p for p in Permission.query.all()}

    seeded_count = 0
    for role_name, perm_keys in ROLE_PERMISSION_MAP.items():
        role = Role.query.filter_by(role_name=role_name).first()
        if not role:
            print(f"  WARNING: Role '{role_name}' not found, skipping")
            continue

        for key in perm_keys:
            perm = all_perms.get(key)
            if not perm:
                print(f"  WARNING: Permission '{key}' not found in DB, skipping")
                continue

            rp = RolePermission(role_id=role.role_id, permission_id=perm.permission_id)
            db.session.add(rp)
            seeded_count += 1

    db.session.commit()
    print(
        f"  Seeded {seeded_count} role-permission mappings for {len(ROLE_PERMISSION_MAP)} roles"
    )
    return seeded_count


def validate_permissions():
    """
    Check for permission anomalies and return a report.
    Returns a dict with any issues found.
    """
    issues = []

    for role_name, expected_keys in ROLE_PERMISSION_MAP.items():
        role = Role.query.filter_by(role_name=role_name).first()
        if not role:
            issues.append(f"Role '{role_name}' does not exist in database")
            continue

        actual_keys = [p.permission_key for p in role.permissions]
        actual_set = set(actual_keys)
        expected_set = set(expected_keys)

        # Check for missing permissions
        missing = expected_set - actual_set
        if missing:
            issues.append(
                f"Role '{role_name}' is missing permissions: {', '.join(sorted(missing))}"
            )

        # Check for extra permissions (should not happen after seed)
        extra = actual_set - expected_set
        if extra:
            issues.append(
                f"Role '{role_name}' has unexpected permissions: {', '.join(sorted(extra))}"
            )

    # Check that no non-admin role has admin-level permissions
    admin_perms = {
        "user.create",
        "user.edit",
        "user.delete",
        "system.backup",
        "system.config",
    }
    for role_name, expected_keys in ROLE_PERMISSION_MAP.items():
        overlap = set(expected_keys) & admin_perms
        if overlap:
            issues.append(
                f"Role '{role_name}' has admin-level permissions: {', '.join(sorted(overlap))}. "
                f"This may be intentional but review it."
            )

    return {
        "valid": len(issues) == 0,
        "issues": issues,
    }
