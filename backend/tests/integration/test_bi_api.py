# backend/tests/integration/test_bi_api.py
import pytest
from datetime import date, timedelta


def _login(client):
    """Log in as admin and store the JWT cookie in the test client."""
    client.post('/api/auth/login', json={
        'username': 'admin',
        'password': 'FlowbizAdmin2024!'
    })


def test_dashboard_requires_auth(client):
    """
    Unauthenticated requests to the BI dashboard must be rejected.
    The dashboard contains sensitive financial data.
    """
    r = client.get('/api/bi/dashboard')
    assert r.status_code == 401


def test_dashboard_returns_stats(client):
    """
    Verifies that GET /api/bi/dashboard returns all four required
    stat fields. The values may be zero in the test database but
    the keys must always be present.
    """
    _login(client)
    r = client.get('/api/bi/dashboard')

    assert r.status_code == 200
    data = r.get_json()
    assert 'stats' in data

    stats = data['stats']
    # all four dashboard stat fields must be present
    assert 'today_revenue'      in stats
    assert 'today_transactions' in stats
    assert 'low_stock_count'    in stats
    assert 'pending_pos'        in stats

    # values must be numbers, not None or strings
    assert isinstance(stats['today_revenue'],      (int, float))
    assert isinstance(stats['today_transactions'], int)
    assert isinstance(stats['low_stock_count'],    int)
    assert isinstance(stats['pending_pos'],        int)


def test_dashboard_stats_are_non_negative(client):
    """
    Verifies that all dashboard stats return non-negative numbers.
    A negative count or revenue would indicate a calculation bug.
    """
    _login(client)
    r = client.get('/api/bi/dashboard')

    stats = r.get_json()['stats']
    assert stats['today_revenue']      >= 0
    assert stats['today_transactions'] >= 0
    assert stats['low_stock_count']    >= 0
    assert stats['pending_pos']        >= 0


def test_revenue_endpoint_with_valid_date_range(client):
    """
    Verifies that GET /api/bi/revenue with valid start and end dates
    returns a list of revenue records (possibly empty in test DB).
    """
    _login(client)

    start = (date.today() - timedelta(days=30)).isoformat()
    end   = date.today().isoformat()

    r = client.get(f'/api/bi/revenue?start_date={start}&end_date={end}')

    assert r.status_code == 200
    data = r.get_json()
    assert 'revenue' in data
    assert isinstance(data['revenue'], list)


def test_revenue_endpoint_without_dates_uses_default(client):
    """
    Verifies that GET /api/bi/revenue with no date parameters
    defaults to the last 30 days instead of returning an error.
    """
    _login(client)
    r = client.get('/api/bi/revenue')

    # should default to last 30 days — not return a 400 error
    assert r.status_code == 200
    assert 'revenue' in r.get_json()


def test_revenue_endpoint_with_future_end_date_rejected(client):
    """
    Verifies that an end_date in the future is rejected.
    You cannot report on revenue that has not happened yet.
    """
    _login(client)

    start = date.today().isoformat()
    end   = (date.today() + timedelta(days=30)).isoformat()

    r = client.get(f'/api/bi/revenue?start_date={start}&end_date={end}')

    # future end date should be rejected with a 400 validation error
    assert r.status_code == 400


def test_customer_summary_returns_list(client):
    """
    Verifies that GET /api/bi/customers returns a list from the
    vw_customer_sales_summary view.
    """
    _login(client)
    r = client.get('/api/bi/customers')

    assert r.status_code == 200
    data = r.get_json()
    assert 'customers' in data
    assert isinstance(data['customers'], list)


def test_kra_queue_returns_list(client):
    """
    Verifies that GET /api/bi/kra-queue returns a list of invoices
    pending or failed KRA submission.
    """
    _login(client)
    r = client.get('/api/bi/kra-queue')

    assert r.status_code == 200
    data = r.get_json()
    assert 'queue' in data
    assert isinstance(data['queue'], list)


def test_bi_endpoints_require_report_view_permission(client, app):
    """
    Verifies that a user without report.view permission cannot
    access any BI endpoint. Creates an inventory_staff user who
    only has inventory permissions.
    """
    from app.models.auth import Role
    from tests.factories import UserFactory
    from app.extensions import db

    with app.app_context():
        inv_role = Role.query.filter_by(role_name='inventory_staff').first()
        if inv_role:
            inv_user = UserFactory(role=inv_role)
            db.session.commit()
            username = inv_user.username

    # log in as inventory staff
    client.post('/api/auth/login', json={
        'username': username,
        'password': 'password123'
    })

    # inventory staff does not have report.view — all BI endpoints must return 403
    assert client.get('/api/bi/dashboard').status_code == 403
    assert client.get('/api/bi/revenue').status_code   == 403
    assert client.get('/api/bi/customers').status_code == 403