# backend/tests/conftest.py
import os
import pytest

# Tell dotenv to load .env.test instead of .env
os.environ['DOTENV_PATH'] = os.path.join(os.path.dirname(__file__), '..', '.env.test')

from app import create_app
from app.extensions import db as _db


@pytest.fixture(scope='session')
def app():
    """
    Create a Flask test app once per test session.
    scope='session' means this runs once for all tests — not once per test.
    The test database is created at the start and dropped at the end.
    """
    app = create_app('config.settings.TestingConfig')
    with app.app_context():
        _db.create_all()
        # seed admin user for auth tests
        from app.services.auth_service import seed_admin
        seed_admin()
        yield app
        _db.drop_all()


@pytest.fixture()
def client(app):
    """Flask test client — make HTTP requests without running a real server."""
    return app.test_client()


@pytest.fixture(autouse=True)
def db_transaction(app):
    """
    Wrap every test in a transaction and roll it back after.
    autouse=True means this runs for every test automatically.
    This ensures tests never leave data in the database — each test
    starts with a clean slate from the session-level seed.
    """
    with app.app_context():
        connection  = _db.engine.connect()
        transaction = connection.begin()
        _db.session.bind = connection

        yield

        _db.session.remove()
        transaction.rollback()
        connection.close()


@pytest.fixture()
def auth_headers(client):
    """Log in as admin and return a logged-in test client."""
    client.post('/api/auth/login', json={
        'username': 'admin',
        'password': 'FlowbizAdmin2024!'
    })
    return client  # cookies are stored in the client automatically