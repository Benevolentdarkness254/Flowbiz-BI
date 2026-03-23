# backend/tests/unit/test_auth.py
from app.services.auth_service import authenticate


def test_authenticate_valid_credentials(app):
    with app.app_context():
        user = authenticate('admin', 'FlowbizAdmin2024!')
        assert user is not None
        assert user.username == 'admin'


def test_authenticate_wrong_password(app):
    with app.app_context():
        user = authenticate('admin', 'wrongpassword')
        assert user is None


def test_authenticate_nonexistent_user(app):
    with app.app_context():
        user = authenticate('nobody', 'password')
        assert user is None


def test_user_get_permissions(app):
    with app.app_context():
        user = authenticate('admin', 'FlowbizAdmin2024!')
        perms = user.get_permissions()
        assert isinstance(perms, list)
        assert 'user.create' in perms      # system_admin has this permission
        assert 'system.config' in perms


def test_user_can(app):
    with app.app_context():
        user = authenticate('admin', 'FlowbizAdmin2024!')
        assert user.can('user.create') is True
        assert user.can('nonexistent.permission') is False