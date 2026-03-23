# backend/tests/integration/test_bi_api.py

def _login(client):
    client.post('/api/auth/login',
                json={'username': 'admin', 'password': 'FlowbizAdmin2026!'})


def test_dashboard_stats(client):
    _login(client)
    r = client.get('/api/bi/dashboard')
    assert r.status_code == 200
    data = r.get_json()
    assert 'stats' in data
    assert 'today_revenue' in data['stats']
    assert 'low_stock_count' in data['stats']


def test_revenue_summary(client):
    _login(client)
    r = client.get('/api/bi/revenue?start_date=2024-01-01&end_date=2024-12-31')
    assert r.status_code == 200
    assert 'revenue' in r.get_json()


def test_bi_requires_report_view_permission(client):
    # unauthenticated request
    r = client.get('/api/bi/dashboard')
    assert r.status_code == 401