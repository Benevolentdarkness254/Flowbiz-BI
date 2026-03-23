# backend/tests/integration/test_sales_api.py
from tests.factories import CustomerFactory, ProductFactory, RoleFactory, UserFactory
from app.extensions import db


def _login(client):
    client.post('/api/auth/login',
                json={'username': 'admin', 'password': 'FlowbizAdmin2026!'})


def test_create_transaction(client, app):
    _login(client)
    with app.app_context():
        customer = CustomerFactory()
        product  = ProductFactory(current_stock=50, price=50.00)
        db.session.commit()

    r = client.post('/api/sales/transactions', json={
        'customer_id':    customer.customer_id,
        'payment_method': 'cash',
        'items': [{'product_id': product.product_id, 'quantity': 1, 'unit_price': 50.00}]
    })
    assert r.status_code == 201
    data = r.get_json()
    assert 'transaction' in data
    assert data['transaction']['payment_status'] == 'paid'


def test_create_transaction_requires_auth(client):
    r = client.post('/api/sales/transactions', json={})
    assert r.status_code == 401


def test_list_transactions(client):
    _login(client)
    r = client.get('/api/sales/transactions')
    assert r.status_code == 200
    assert 'transactions' in r.get_json()


def test_create_transaction_insufficient_stock(client, app):
    _login(client)
    with app.app_context():
        customer = CustomerFactory()
        product  = ProductFactory(current_stock=1)
        db.session.commit()

    r = client.post('/api/sales/transactions', json={
        'customer_id':    customer.customer_id,
        'payment_method': 'cash',
        'items': [{'product_id': product.product_id, 'quantity': 100, 'unit_price': 50}]
    })
    assert r.status_code == 422