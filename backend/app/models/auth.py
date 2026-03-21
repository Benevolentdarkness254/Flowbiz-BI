from datetime import datetime
from app.extensions import db


class Permission(db.Model):
    __tablename__ = 'permissions'

    permission_id  = db.Column(db.Integer,     primary_key=True)
    permission_key = db.Column(db.String(100), nullable=False, unique=True)
    module         = db.Column(db.String(50),  nullable=False)
    description    = db.Column(db.Text)
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)


class Role(db.Model):
    __tablename__ = 'roles'

    role_id     = db.Column(db.Integer,    primary_key=True)
    role_name   = db.Column(db.String(50), nullable=False, unique=True)
    description = db.Column(db.Text)
    is_active   = db.Column(db.Boolean, default=True)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at  = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    permissions = db.relationship(
        'Permission',
        secondary='role_permissions',
        lazy='joined'
    )


class RolePermission(db.Model):
    __tablename__ = 'role_permissions'

    role_id       = db.Column(db.Integer, db.ForeignKey('roles.role_id'),       primary_key=True)
    permission_id = db.Column(db.Integer, db.ForeignKey('permissions.permission_id'), primary_key=True)
    granted_at    = db.Column(db.DateTime, default=datetime.utcnow)


class User(db.Model):
    __tablename__ = 'users'

    user_id       = db.Column(db.Integer,     primary_key=True)
    username      = db.Column(db.String(50),  nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    email         = db.Column(db.String(100), nullable=False, unique=True)
    full_name     = db.Column(db.String(100), nullable=False)
    role_id       = db.Column(db.Integer, db.ForeignKey('roles.role_id'), nullable=False)
    phone         = db.Column(db.String(20))
    is_active     = db.Column(db.Boolean, default=True)
    last_login_at = db.Column(db.DateTime)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at    = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at    = db.Column(db.DateTime)
    role = db.relationship('Role', lazy='joined')

    def get_permissions(self) -> list[str]:
        """Return a flat list of permission key strings for this user."""
        return [p.permission_key for p in self.role.permissions]

    def can(self, key: str) -> bool:
        """Check if this user holds a specific permission."""
        return key in self.get_permissions()

    def __repr__(self):
        return f'<User {self.username} ({self.role.role_name})>'
