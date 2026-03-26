# backend/app/api/auth.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    set_access_cookies,
    unset_jwt_cookies,
    jwt_required,
    get_jwt_identity,
)
from marshmallow import ValidationError
from app.services.auth_service import authenticate, create_user
from app.models.auth import User
from app.schemas.auth import LoginSchema, UserSchema, CreateUserSchema
from app.api.decorators import require_permission
from app.extensions import db

auth_bp = Blueprint("auth", __name__)

login_schema = LoginSchema()
user_schema = UserSchema()
create_user_schema = CreateUserSchema()


@auth_bp.post("/login")
def login():
    """
    Authenticate a user and issue a JWT stored in an HTTP-only cookie.
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
    return response


@auth_bp.post("/logout")
@jwt_required()
def logout():
    """Clear the JWT cookie."""
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
        user = create_user(**data)
    except ValueError as e:
        return jsonify(error=str(e)), 422

    return jsonify(user=user_schema.dump(user)), 201
