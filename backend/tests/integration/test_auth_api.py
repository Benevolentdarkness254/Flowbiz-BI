# backend/tests/integration/test_auth_api.py

def test_login_success(client):
    r = client.post('/api/auth/login',
                    json={'username': 'admin', 'password': 'FlowbizAdmin2026!'})
    assert r.status_code == 200
    data = r.get_json()
    assert 'user' in data
    assert data['user']['username'] == 'admin'
    # JWT should be in cookies — not in the response body
    assert 'access_token_cookie' in r.headers.get('Set-Cookie', '')


def test_login_wrong_password(client):
    r = client.post('/api/auth/login',
                    json={'username': 'admin', 'password': 'wrong'})
    assert r.status_code == 401


def test_me_requires_auth(client):
    r = client.get('/api/auth/me')
    assert r.status_code == 401


def test_me_returns_user_after_login(client):
    client.post('/api/auth/login',
                json={'username': 'admin', 'password': 'FlowbizAdmin2026!'})
    r = client.get('/api/auth/me')
    assert r.status_code == 200
    assert r.get_json()['user']['username'] == 'admin'


def test_logout_clears_cookie(client):
    client.post('/api/auth/login',
                json={'username': 'admin', 'password': 'FlowbizAdmin2026!'})
    client.post('/api/auth/logout')
    r = client.get('/api/auth/me')
    assert r.status_code == 401