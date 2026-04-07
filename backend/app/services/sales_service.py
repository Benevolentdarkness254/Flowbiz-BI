import decimal
from datetime import datetime
from app.extensions import db
from app.models.sales import SaleTransaction, SaleItem, Customer, OutboundDelivery
from app.models.inventory import Product
from app.models.enums import (
    StockMovementType,
    PaymentMethod,
    PaymentStatus,
    DeliveryStatus,
)
from app.services.inventory_service import adjust_stock
from app.services.receipt_service import issue_payment_receipt
from app.api.system import get_zone_eta

VAT_RATE = decimal.Decimal("0.16")


def create_sale(data: dict, staff_user_id: int) -> tuple:
    """
    Create a sale transaction with optional outbound delivery.

    If delivery_driver_id and delivery_date are provided in data,
    an OutboundDelivery record is created alongside the sale.
    The delivery's ETA is auto-calculated from the zone using system settings.
    """
    items_data = data.get("items", [])
    if not items_data:
        raise ValueError("A sale must have at least one item")

    for item in items_data:
        product = db.session.get(Product, item["product_id"])
        if not product or not product.is_active:
            raise ValueError(f"Product {item['product_id']} not found or is inactive")
        if product.current_stock < item["quantity"]:
            raise ValueError(
                f"Insufficient Stock for {product.name}. "
                f"Available: {product.current_stock}, requested: {item['quantity']}"
            )

    D = decimal.Decimal
    lines_totals = [
        (D(str(i["unit_price"])) * i["quantity"]) - D(str(i.get("discount", 0)))
        for i in items_data
    ]
    subtotal = sum(lines_totals)
    discount_amount = D(str(data.get("discount_amount", 0)))
    tax_amount = ((subtotal - discount_amount) * VAT_RATE).quantize(D("0.01"))
    total_amount = subtotal - discount_amount + tax_amount

    txn = SaleTransaction(
        customer_id=data["customer_id"],
        sales_staff_id=staff_user_id,
        subtotal=subtotal,
        discount_amount=discount_amount,
        tax_amount=tax_amount,
        total_amount=total_amount,
        payment_method=PaymentMethod(data["payment_method"]),
        payment_status=PaymentStatus.PAID,
        mpesa_ref=data.get("mpesa_ref"),
        notes=data.get("notes"),
    )
    db.session.add(txn)
    db.session.flush()

    for item in items_data:
        sale_item = SaleItem(
            transaction_id=txn.transaction_id,
            product_id=item["product_id"],
            quantity=item["quantity"],
            unit_price=item["unit_price"],
            discount=item.get("discount", 0),
        )
        db.session.add(sale_item)

        adjust_stock(
            product_id=item["product_id"],
            quantity_change=-item["quantity"],
            movement_type=StockMovementType.SALE,
            performed_by_id=staff_user_id,
            reference_type="sale_transaction",
            reference_id=txn.transaction_id,
        )

    # Create outbound delivery if delivery details were provided
    delivery_id = None
    if data.get("delivery_driver_id") and data.get("delivery_date"):
        customer = db.session.get(Customer, data["customer_id"])
        zone = data.get("delivery_zone") or (customer.zone if customer else None)
        eta_minutes = get_zone_eta(zone) if zone else get_zone_eta(None)

        delivery = OutboundDelivery(
            transaction_id=txn.transaction_id,
            driver_id=data["delivery_driver_id"],
            customer_id=data["customer_id"],
            scheduled_date=datetime.fromisoformat(data["delivery_date"]),
            delivery_zone=zone,
            eta_minutes=eta_minutes,
            delivery_notes=data.get("delivery_notes"),
            status=DeliveryStatus.SCHEDULED,
        )
        db.session.add(delivery)
        db.session.flush()
        delivery_id = delivery.delivery_id

    db.session.commit()
    issue_payment_receipt(txn, staff_user_id)

    return txn, delivery_id
