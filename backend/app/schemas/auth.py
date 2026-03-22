# backend/app/schemas/auth.py
from flask_marshmallow import Marshmallow
from marshmallow import fields, validate, validates, ValidationError
from app.models.auth import User, Role

ma = Marshmallow()


class LoginSchema(ma.Schema):
    """Validates the /api/auth/login request body."""
    username = fields.Str(required=True, validate=validate.Length(min=1))
    password = fields.Str(required=True, validate=validate.Length(min=1))


class UserSchema(ma.SQLAlchemyAutoSchema):
    """Serializes a User object to JSON. Auto-generates fields from the model."""
    class Meta:
        model   = User
        exclude = ('password_hash', 'deleted_at')  # never serialize these
        load_instance = True

    role_name = fields.Method('get_role_name')

    def get_role_name(self, obj):
        return obj.role.role_name if obj.role else None


class CreateUserSchema(ma.Schema):
    """Validates admin user creation request."""
    username  = fields.Str(required=True, validate=validate.Length(min=3, max=50))
    email     = fields.Email(required=True)
    full_name = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    password  = fields.Str(required=True, validate=validate.Length(min=8))
    role_name = fields.Str(required=True)
    phone     = fields.Str(load_default=None)