# backend/tests/unit/test_sales_service.py
import pytest
from app.services.sales_service import create_sale
from app.models.sales import SaleTransaction
from app.models.inventory import Product
from app.extensions import db
from tests.factories import CustomerFactory, ProductFactory, UserFactory, RoleFactory


def test_create_sale_success(app):
    with app.app_context():
        # arrange
        role     = RoleFactory()
        staff    = UserFactory(role=role)
        customer = CustomerFactory()
        product  = ProductFactory(current_stock=50, price=50.00)
        db.session.flush()

        data = {
            'customer_id':    customer.customer_id,
            'payment_method': 'cash',
            'items': [{
                'product_id': product.product_id,
                'quantity':   2,
                'unit_price': 50.00,
            }]
        }

        txn = create_sale(data, staff_user_id=staff.user_id)

        assert txn.transaction_id is not None
        assert float(txn.total_amount) > 0
        # stock should have been decremented
        refreshed = db.session.get(Product, product.product_id)
        assert refreshed.current_stock == 48


def test_create_sale_insufficient_stock(app):
    with app.app_context():
        role     = RoleFactory()
        staff    = UserFactory(role=role)
        customer = CustomerFactory()
        product  = ProductFactory(current_stock=1)
        db.session.flush()

        data = {
            'customer_id':    customer.customer_id,
            'payment_method': 'cash',
            'items': [{'product_id': product.product_id, 'quantity': 5, 'unit_price': 50}]
        }

        with pytest.raises(ValueError, match='Insufficient stock'):
            create_sale(data, staff_user_id=staff.user_id)


def test_create_sale_empty_items(app):
    with app.app_context():
        role     = RoleFactory()
        staff    = UserFactory(role=role)
        customer = CustomerFactory()
        db.session.flush()

        with pytest.raises(ValueError, match='at least one item'):
            create_sale({'customer_id': customer.customer_id,
                         'payment_method': 'cash', 'items': []},
                        staff_user_id=staff.user_id)