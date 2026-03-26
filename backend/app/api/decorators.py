# backend/app/api/decorators.py
from functools import wraps
from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.auth import User


def require_permission(key: str):
    """
    Decorator that checks a permission key before allowing a route to execute.
    Usage: @require_permission('sale.create')

    It wraps @jwt_required() so you only need one decorator per route.
    Unlike the previous version that stored permissions in JWT (which could become stale),
    this decorator fetches fresh permissions from the database on each request.
    """

    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user_id = int(get_jwt_identity())  # Convert string user_id back to int
            user = db.session.get(User, user_id)
            if not user or not user.is_active:
                return jsonify(error="User not found or deactivated"), 401

            # Get fresh permissions from the user's role
            permissions = user.get_permissions()
            if key not in permissions:
                return jsonify(
                    error="You do not have permission to perform this action"
                ), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator
