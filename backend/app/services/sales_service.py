import decimal
from app.extensions import db
from app.models.sales import SaleTransaction, SaleItem, Customer
from app.models.inventory import Product
from app.models.enums import StockMovementType, PaymentMethod, PaymentStatus
from app.services.inventory_service import adjust_stock
from app.services.receipt_service import issue_payment_receipt

VAT_RATE = decimal.Decimal('0.16')
def create_sale(data: dict, staff_id: int ) -> SaleTransaction:
    items_data = data.get('items', [] )
    if not items_data:
        raise ValueError(f"A sale must have atleast one item")
    for item in items_data:
        product = db.session.get(Product, item['product_id'])
        if not product or not product.is_active:
            raise ValueError(f"Product {item['product_id']} not found or is inactive")
        if product.current_stock < item['quantity']:
            raise ValueError(
                f"Insufficent Stock for {product.name} ."
                f"Availiable: {product.current_stock}, requested {item['quantity']}"
            )
    D = decimal.Decimal
    lines_totals = [
        (D(str(i['unit_price'])) * i['quantity']) - D(str(i.get('discount', 0)))
        for i in items_data
    ] 
    subtotal = sum(lines_totals)
    discount_amount = D(str(data.get('discount_amount', 0)))
    tax_amount      = ((subtotal - discount_amount) * VAT_RATE).quantize(D('0.01'))
    total_amount    = subtotal - discount_amount + tax_amount
    txn = SaleTransaction(
        customer_id     = data['customer_id'],
        sales_staff_id  = staff_user_id,
        subtotal        = subtotal,
        discount_amount = discount_amount,
        tax_amount      = tax_amount,
        total_amount    = total_amount,
        payment_method  = PaymentMethod(data['payment_method']),
        payment_status  = PaymentStatus.PAID,
        mpesa_ref       = data.get('mpesa_ref'),
        notes           = data.get('notes'),
    )
    db.session.add(txn)
    db.session.flush()
    for item in items_data:
        sale_item = SaleItem(
            transaction_id = txn.transaction_id,
            product_id     = item['product_id'],
            quantity       = item['quantity'],
            unit_price     = item['unit_price'],
            discount       = item.get('discount', 0),
        )
        db.session.add(sale_item)

        # adjust_stock writes the ledger entry and updates products.current_stock
        adjust_stock(
            product_id      = item['product_id'],
            quantity_change = -item['quantity'],  # negative = outbound
            movement_type   = StockMovementType.SALE,
            performed_by_id = staff_user_id,
            reference_type  = 'sale_transaction',
            reference_id    = txn.transaction_id,
        )

    # 6. Commit everything atomically
    db.session.commit()
    issue_payment_receipt(txn, staff_user_id)
    return txn

