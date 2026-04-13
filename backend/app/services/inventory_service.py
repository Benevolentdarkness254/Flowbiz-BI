# Import the database instance from app.extensions.
# This 'db' object is typically an instance of SQLAlchemy,
# used for database operations like session management and model definition.
from app.extensions import db
from app.models.enums import StockMovementType
from app.models.inventory import InventoryMovement, Product, StockAlert

# This module defines functions for managing inventory,
# including adjusting product stock levels and generating stock alerts.
# It interacts with the database models for Product, InventoryMovement, and StockAlert.


def adjust_stock(
    product_id: int,  # product_id: The unique identifier for the product whose stock is being adjusted.
    quantity_change: int,  # quantity_change: The amount by which the stock should change.
    #                  Positive values indicate an increase (e.g., receiving new stock).
    #                  Negative values indicate a decrease (e.g., selling a product).
    movement_type: StockMovementType,  # movement_type: An enumeration member indicating the nature of the stock change
    #                (e.g., StockMovementType.IN, StockMovementType.OUT, StockMovementType.ADJUSTMENT).
    performed_by_id: int,  # performed_by_id: The ID of the user or system responsible for this stock adjustment.
    reference_type: str = None,  # reference_type: Optional string to categorize the external reference
    #                 (e.g., "ORDER", "RETURN", "MANUAL_ADJUSTMENT"). Defaults to None.
    reference_id: int = None,  # reference_id: Optional integer ID linking to an external record, such as an order ID or return ID. Defaults to None.
    notes: str = None,  # notes: Optional text field for additional comments or details about the stock movement. Defaults to None.
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

    # This private helper function is responsible for evaluating a product's stock level
    # immediately after a stock adjustment.
    # If the stock falls below the minimum threshold or becomes zero, it creates
    # a new StockAlert entry in the database, preventing duplicate alerts for
    # the same unresolved issue.


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
