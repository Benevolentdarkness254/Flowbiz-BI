from app.extensions import db
from app.models.inventory import Product, InventoryMovement, StockAlert
from app.models.enums import StockMovementType


def adjust_stock(
    product_id: int,
    quantity_change: int,
    movement_type: StockMovementType,
    performed_by_id: int,
    reference_type: str = None,
    reference_id: int = None,
    notes: str = None,
) -> InventoryMovement:
    product = db.session.get(Product, product_id)
    if not product:
        raise ValueError(f"Product {product} is not found. ")

    new_stock = product.current_stock + quantity_change
    if new_stock < 0:
        raise ValueError(
            f"Insufficient stock for {product.name}."
            f"Available: {product.current_stock}, Requested: {abs(quantity_change)}"
        )
    product.current_stock = new_stock
    movement = InventoryMovement(
        product_id=product_id,
        movement_type=movement_type,
        reference_type=reference_type,
        reference_id=reference_id,
        quantity_change=quantity_change,
        stock_after=new_stock,
        performed_by=performed_by_id,
        notes=notes,
    )
    db.session.add(movement)
    _check_and_create_alert(product)
    return movement


def _check_and_create_alert(product: Product):
    if product.current_stock <= 0:
        alert_type = "out_of_stock"
    elif product.current_stock <= product.min_stock_level:
        alert_type = "low_stock"
    else:
        return

    existing = StockAlert.query.filter_by(
        product_id=product.product_id, is_resolved=False
    ).first()
    if not existing:
        alert = StockAlert(
            product_id=product.product_id,
            alert_type=alert_type,
            current_stock=product.current_stock,
            threshold=product.min_stock_level,
        )
        db.session.add(alert)
