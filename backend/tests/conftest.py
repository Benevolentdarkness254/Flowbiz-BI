# backend/tests/conftest.py
import os
import pytest
from dotenv import load_dotenv

# Use the dev database for testing — simpler and avoids seed data issues
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from app import create_app
from app.extensions import db as _db


@pytest.fixture(scope='session')
def app():
    """
    Create the Flask test app once for the entire session.
    Uses the dev database — roles and permissions are already seeded.
    """
    app = create_app('config.settings.Config')

    with app.app_context():
        # make sure admin user exists
        from app.services.auth_service import seed_admin
        seed_admin()
        yield app


@pytest.fixture()
def client(app):
    """Flask test client with cookie support."""
    with app.test_client() as client:
        yield client


@pytest.fixture()
def auth_client(client):
    """Pre-authenticated test client logged in as admin."""
    client.post('/api/auth/login', json={
        'username': 'admin',
        'password': 'FlowbizAdmin2024!'
    })
    return client