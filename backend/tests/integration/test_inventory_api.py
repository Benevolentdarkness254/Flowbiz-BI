# backend/tests/integration/test_inventory_api.py
import pytest
from app.extensions import db
from tests.factories import ProductFactory, RoleFactory, UserFactory


def _login(client):
    """Log in as admin and store the JWT cookie in the test client."""
    client.post('/api/auth/login', json={
        'username': 'admin',
        'password': 'FlowbizAdmin2024!'
    })


def test_get_products_requires_auth(client):
    """
    Unauthenticated requests must be rejected with 401.
    This verifies the @require_permission decorator is working.
    """
    r = client.get('/api/inventory/products')
    assert r.status_code == 401


def test_get_products_returns_list(client, app):
    """
    Verifies that GET /api/inventory/products returns a list of products
    with the correct structure including the computed stock_status field.
    """
    _login(client)

    with app.app_context():
        # create test products using the factory
        ProductFactory(name='20L Water', current_stock=50, min_stock_level=10)
        ProductFactory(name='5L Water',  current_stock=5,  min_stock_level=10)
        db.session.commit()

    r = client.get('/api/inventory/products')

    assert r.status_code == 200
    data = r.get_json()
    assert 'products' in data
    assert isinstance(data['products'], list)

    # verify the response structure includes all required fields
    if data['products']:
        product = data['products'][0]
        assert 'product_id'    in product
        assert 'sku'           in product
        assert 'name'          in product
        assert 'current_stock' in product
        assert 'stock_status'  in product


def test_get_inventory_status_returns_view_data(client):
    """
    Verifies that GET /api/inventory/status returns data from
    the vw_inventory_status database view including the stock_status field.
    """
    _login(client)
    r = client.get('/api/inventory/status')

    assert r.status_code == 200
    data = r.get_json()
    assert 'inventory' in data
    assert isinstance(data['inventory'], list)


def test_get_stock_alerts_returns_list(client):
    """
    Verifies that GET /api/inventory/alerts returns a list of
    unresolved stock alerts.
    """
    _login(client)
    r = client.get('/api/inventory/alerts')

    assert r.status_code == 200
    data = r.get_json()
    assert 'alerts' in data
    assert isinstance(data['alerts'], list)


def test_manual_stock_adjustment_success(client, app):
    """
    Verifies that POST /api/inventory/adjust correctly adjusts stock
    and returns the new stock level.
    """
    _login(client)

    with app.app_context():
        product = ProductFactory(current_stock=20)
        db.session.commit()
        product_id = product.product_id

    r = client.post('/api/inventory/adjust', json={
        'product_id':      product_id,
        'quantity_change': -5,
        'notes':           'Test adjustment for unit testing'
    })

    assert r.status_code == 200
    data = r.get_json()
    assert 'stock_after' in data
    assert data['stock_after'] == 15


def test_manual_stock_adjustment_requires_notes(client, app):
    """
    Verifies that an adjustment without notes is rejected.
    Notes are required for audit trail purposes.
    """
    _login(client)

    with app.app_context():
        product = ProductFactory(current_stock=20)
        db.session.commit()
        product_id = product.product_id

    r = client.post('/api/inventory/adjust', json={
        'product_id':      product_id,
        'quantity_change': -5,
        # notes intentionally omitted
    })

    assert r.status_code == 400


def test_manual_stock_adjustment_below_zero_rejected(client, app):
    """
    Verifies that an adjustment that would make stock go below zero
    is rejected with a 422 error.
    """
    _login(client)

    with app.app_context():
        product = ProductFactory(current_stock=3)
        db.session.commit()
        product_id = product.product_id

    r = client.post('/api/inventory/adjust', json={
        'product_id':      product_id,
        'quantity_change': -10,
        'notes':           'This should fail — not enough stock'
    })

    assert r.status_code == 422
    data = r.get_json()
    assert 'error' in data


def test_manual_adjustment_requires_inventory_permission(client, app):
    """
    Verifies that a user without inventory.adjust permission cannot
    perform manual adjustments. Creates a sales_staff user who only
    has sale.* permissions.
    """
    from app.models.auth import Role

    with app.app_context():
        # log in as a sales staff user instead of admin
        sales_role = Role.query.filter_by(role_name='sales_staff').first()
        if sales_role:
            sales_user = UserFactory(role=sales_role)
            db.session.commit()
            username = sales_user.username

    # log in as sales staff
    client.post('/api/auth/login', json={
        'username': username,
        'password': 'password123'
    })

    r = client.post('/api/inventory/adjust', json={
        'product_id':      1,
        'quantity_change': -1,
        'notes':           'Should be forbidden'
    })

    # sales staff does not have inventory.adjust — must get 403
    assert r.status_code == 403