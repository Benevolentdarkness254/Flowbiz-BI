# backend/tests/unit/test_inventory_service.py
import pytest
from app.services.inventory_service import adjust_stock
from app.models.enums import StockMovementType
from app.extensions import db
from tests.factories import ProductFactory, UserFactory, RoleFactory


def test_adjust_stock_outbound(app):
    with app.app_context():
        role    = RoleFactory()
        user    = UserFactory(role=role)
        product = ProductFactory(current_stock=20)
        db.session.flush()

        movement = adjust_stock(
            product_id      = product.product_id,
            quantity_change = -5,
            movement_type   = StockMovementType.SALE,
            performed_by_id = user.user_id,
        )

        assert movement.stock_after == 15
        assert movement.quantity_change == -5


def test_adjust_stock_below_zero_raises(app):
    with app.app_context():
        role    = RoleFactory()
        user    = UserFactory(role=role)
        product = ProductFactory(current_stock=3)
        db.session.flush()

        with pytest.raises(ValueError, match='Insufficient stock'):
            adjust_stock(
                product_id      = product.product_id,
                quantity_change = -10,
                movement_type   = StockMovementType.SALE,
                performed_by_id = user.user_id,
            )