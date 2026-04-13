# backend/app/api/auth.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    set_access_cookies,
    unset_jwt_cookies,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)
from marshmallow import ValidationError
from app.services.auth_service import authenticate, create_user
from app.models.auth import User
from app.schemas.auth import LoginSchema, UserSchema, CreateUserSchema
from app.api.decorators import require_permission
from app.extensions import db
from datetime import datetime

auth_bp = Blueprint("auth", __name__)

login_schema = LoginSchema()
user_schema = UserSchema()
create_user_schema = CreateUserSchema()


def _log_audit(
    user_id, action, table_name, record_id, old_value, new_value, ip_address
):
    """Write an entry to the audit_log table."""
    db.session.execute(
        db.text("""
            INSERT INTO audit_log (user_id, action, table_name, record_id, old_value, new_value, ip_address, created_at)
            VALUES (:user_id, :action, :table_name, :record_id, :old_value, :new_value, :ip_address, :created_at)
        """),
        {
            "user_id": user_id,
            "action": action,
            "table_name": table_name,
            "record_id": record_id,
            "old_value": old_value,
            "new_value": new_value,
            "ip_address": ip_address,
            "created_at": datetime.utcnow(),
        },
    )
    db.session.commit()


@auth_bp.post("/login")
def login():
    """
    Authenticate a user and issue a JWT stored in an HTTP-only cookie.
    Logs the login event to audit_log for security tracking.
    """
    try:
        data = login_schema.load(request.get_json() or {})
    except ValidationError as e:
        return jsonify(errors=e.messages), 400

    user = authenticate(data["username"], data["password"])
    if not user:
        return jsonify(error="Invalid username or password"), 401

    # Use user_id as the JWT identity (subject) - must be a string
    token = create_access_token(identity=str(user.user_id))
    response = jsonify(
        user={
            "user_id": user.user_id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role.role_name,
            "permissions": user.get_permissions(),
        }
    )
    # set_access_cookies sets an HTTP-only cookie — JavaScript cannot read it
    # This is what makes it safe against XSS attacks
    set_access_cookies(response, token)

    # Log successful login to audit trail
    ip = request.headers.get("X-Forwarded-For", request.remote_addr)
    if ip and "," in ip:
        ip = ip.split(",")[0].strip()
    _log_audit(
        user_id=user.user_id,
        action="login",
        table_name="users",
        record_id=user.user_id,
        old_value=None,
        new_value=f'{{"username": "{user.username}", "role": "{user.role.role_name}"}}',
        ip_address=ip,
    )

    return response


@auth_bp.post("/logout")
@jwt_required()
def logout():
    """Clear the JWT cookie and log the logout event."""
    user_id = int(get_jwt_identity())
    ip = request.headers.get("X-Forwarded-For", request.remote_addr)
    if ip and "," in ip:
        ip = ip.split(",")[0].strip()

    _log_audit(
        user_id=user_id,
        action="logout",
        table_name="users",
        record_id=user_id,
        old_value=None,
        new_value='{"event": "user_logged_out"}',
        ip_address=ip,
    )

    response = jsonify(message="Logged out successfully")
    unset_jwt_cookies(response)
    return response


@auth_bp.get("/me")
@jwt_required()
def me():
    """Return the currently authenticated user's profile and permissions."""
    user_id = int(get_jwt_identity())  # Convert string back to int
    user = db.session.get(User, user_id)
    if not user or not user.is_active:
        return jsonify(error="User not found or deactivated"), 404

    # We need to get permissions from the user's role since we only stored user_id in JWT
    permissions = user.get_permissions()

    return jsonify(
        user={
            "user_id": user.user_id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role.role_name,
        },
        permissions=permissions,
    )


@auth_bp.post("/users")
@require_permission("user.create")
def create_user_route():
    """Admin endpoint to create a new user."""
    try:
        data = create_user_schema.load(request.get_json() or {})
    except ValidationError as e:
        return jsonify(errors=e.messages), 400

    try:
        # Map 'phone' from the schema to 'phone_number' expected by the service
        phone = data.pop("phone", None)
        if phone:
            data["phone_number"] = phone
        user = create_user(**data)
    except ValueError as e:
        return jsonify(error=str(e)), 422

    return jsonify(user=user_schema.dump(user)), 201


@auth_bp.get("/users")
@require_permission("user.view")
def list_users():
    """
    List all active users with their roles.
    System admins can see deleted users too via ?include_deleted=true.
    """
    include_deleted = request.args.get("include_deleted", "false").lower() == "true"

    query = User.query
    if not include_deleted:
        query = query.filter_by(deleted_at=None)

    users = query.order_by(User.created_at.desc()).all()
    return jsonify(
        users=[user_schema.dump(u) for u in users],
        total=len(users),
    )


@auth_bp.get("/users/<int:user_id>")
@require_permission("user.view")
def get_user(user_id):
    """Get a single user by ID."""
    user = db.session.get(User, user_id)
    if not user:
        return jsonify(error="User not found"), 404
    return jsonify(user=user_schema.dump(user))


@auth_bp.put("/users/<int:user_id>")
@require_permission("user.edit")
def update_user(user_id):
    """
    Update a user's profile fields.
    Admins can change: full_name, email, phone, role, is_active, password.
    Cannot edit own role or deactivate own account (prevents lockout).
    """
    user = db.session.get(User, user_id)
    if not user:
        return jsonify(error="User not found"), 404

    current_user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    # Prevent self-role-change and self-deactivation
    if user.user_id == current_user_id:
        if "role_name" in data:
            return jsonify(error="You cannot change your own role"), 403
        if "is_active" in data and not data["is_active"]:
            return jsonify(error="You cannot deactivate your own account"), 403

    # Update fields if provided
    if "full_name" in data:
        user.full_name = data["full_name"]
    if "email" in data:
        # Check uniqueness
        existing = User.query.filter_by(email=data["email"]).first()
        if existing and existing.user_id != user_id:
            return jsonify(error="Email already in use"), 422
        user.email = data["email"]
    if "phone" in data:
        user.phone = data["phone"]
    if "is_active" in data:
        user.is_active = bool(data["is_active"])
    if "password" in data and data["password"]:
        from werkzeug.security import generate_password_hash

        if len(data["password"]) < 8:
            return jsonify(error="Password must be at least 8 characters"), 400
        user.password_hash = generate_password_hash(data["password"])
    if "role_name" in data:
        from app.models.auth import Role

        role = Role.query.filter_by(role_name=data["role_name"]).first()
        if not role:
            return jsonify(error=f"Role '{data['role_name']}' does not exist"), 422
        user.role_id = role.role_id

    db.session.commit()
    return jsonify(user=user_schema.dump(user))


@auth_bp.delete("/users/<int:user_id>")
@require_permission("user.delete")
def delete_user(user_id):
    """
    Soft-delete a user by setting deleted_at timestamp.
    Cannot delete your own account (prevents lockout).
    """
    from datetime import datetime

    user = db.session.get(User, user_id)
    if not user:
        return jsonify(error="User not found"), 404

    current_user_id = int(get_jwt_identity())
    if user.user_id == current_user_id:
        return jsonify(error="You cannot delete your own account"), 403

    if user.deleted_at:
        return jsonify(error="User is already deleted"), 404

    user.deleted_at = datetime.utcnow()
    db.session.commit()
    return jsonify(message=f"User '{user.username}' has been deactivated")


@auth_bp.post("/users/<int:user_id>/restore")
@require_permission("user.edit")
def restore_user(user_id):
    """Restore a soft-deleted user by clearing deleted_at."""
    user = db.session.get(User, user_id)
    if not user:
        return jsonify(error="User not found"), 404
    if not user.deleted_at:
        return jsonify(error="User is not deleted"), 400

    user.deleted_at = None
    db.session.commit()
    return jsonify(
        message=f"User '{user.username}' has been restored", user=user_schema.dump(user)
    )


@auth_bp.get("/roles")
@require_permission("user.view")
def list_roles():
    """Return all available roles for the user creation/edit dropdown."""
    from app.models.auth import Role

    roles = Role.query.filter_by(is_active=True).order_by(Role.role_name).all()
    return jsonify(
        roles=[
            {
                "role_id": r.role_id,
                "role_name": r.role_name,
                "description": r.description,
            }
            for r in roles
        ]
    )


@auth_bp.get("/permissions/debug")
@require_permission("system.config")
def debug_permissions():
    """
    Admin-only diagnostic endpoint.
    Returns every role with its actual permissions for debugging.
    """
    from app.models.auth import Role
    from app.services.permission_service import validate_permissions

    roles_data = []
    for role in Role.query.order_by(Role.role_name).all():
        perm_keys = [p.permission_key for p in role.permissions]
        roles_data.append(
            {
                "role_id": role.role_id,
                "role_name": role.role_name,
                "permission_count": len(perm_keys),
                "permissions": sorted(perm_keys),
            }
        )

    validation = validate_permissions()

    return jsonify(
        roles=roles_data,
        validation=validation,
    )
