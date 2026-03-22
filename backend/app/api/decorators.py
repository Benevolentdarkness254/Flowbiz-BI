# backend/app/api/decorators.py
from functools import wraps
from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity


def require_permission(key: str):
    """
    Decorator that checks a permission key before allowing a route to execute.
    Usage: @require_permission('sale.create')

    It wraps @jwt_required() so you only need one decorator per route.
    The permission keys in the JWT come from the user's role at login time.
    If a role's permissions change in the DB, users need to log out and
    back in for the change to take effect (JWT is issued at login).
    """
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            identity = get_jwt_identity()
            if key not in identity.get('permissions', []):
                return jsonify(error='You do not have permission to perform this action'), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator