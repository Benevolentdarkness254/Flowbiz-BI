from sqlalchemy import text
from datetime import datetime
from app.extensions import db
from app.models.receipts import Receipt, ReceiptPrintLog
from app.models.sales import SaleTransaction, Customer
from app.models.enums import ReceiptType, PaymentMethod, KRAStatus, DispatchChannel


def _next_receipt_number(prefix: str) -> str:
    """
    Generate a gap-free receipt number in Python.
    Format: RCP-20260403-0001
    Uses MAX receipt number for today + 1.
    """
    today = datetime.utcnow().strftime("%Y%m%d")
    pattern = f"{prefix}-{today}-%"
    result = db.session.execute(
        text("""
            SELECT receipt_number FROM receipts
            WHERE receipt_number LIKE :pattern
            ORDER BY receipt_number DESC
            LIMIT 1
        """),
        {"pattern": pattern},
    ).first()

    if result:
        last_num = int(result[0].split("-")[-1])
        next_num = last_num + 1
    else:
        next_num = 1

    return f"{prefix}-{today}-{next_num:04d}"


def issue_payment_receipt(txn: SaleTransaction, issued_by_id: int) -> Receipt:
    """
    Issue a payment receipt for a completed sale.
    For cash/card payments, credit_balance does not change.
    For credit payments, credit_balance increases (customer owes more).
    """
    customer = db.session.get(Customer, txn.customer_id)
    bal_before = float(customer.credit_balance)

    if txn.payment_method == PaymentMethod.CREDIT:
        customer.credit_balance = float(customer.credit_balance) + float(
            txn.total_amount
        )
    bal_after = float(customer.credit_balance)

    receipt = Receipt(
        receipt_number=_next_receipt_number("RCP"),
        receipt_type=ReceiptType.PAYMENT,
        transaction_id=txn.transaction_id,
        issued_by=issued_by_id,
        customer_id=txn.customer_id,
        amount_paid=txn.total_amount,
        balance_before=bal_before,
        balance_after=bal_after,
        payment_method=txn.payment_method,
        mpesa_ref=txn.mpesa_ref,
        kra_status=KRAStatus.NOT_SUBMITTED,
    )
    db.session.add(receipt)
    db.session.commit()

    # queue for digital display (always) — thermal/SMS/PDF triggered separately
    log = ReceiptPrintLog(
        receipt_id=receipt.receipt_id,
        dispatch_channel=DispatchChannel.DIGITAL_ONLY,
        dispatched_by=issued_by_id,
        status="sent",
    )
    db.session.add(log)
    db.session.commit()

    return receipt


def void_receipt(receipt_id: int, voided_by_id: int, reason: str) -> Receipt:
    """
    Void a receipt. Never hard-delete financial records.
    Sets voided_at timestamp — application filters these out of normal views.
    """
    from datetime import datetime

    receipt = db.session.get(Receipt, receipt_id)
    if not receipt:
        raise ValueError(f"Receipt {receipt_id} not found")
    if receipt.voided_at:
        raise ValueError("Receipt is already voided")

    receipt.voided_at = datetime.utcnow()
    receipt.voided_by = voided_by_id
    receipt.void_reason = reason
    db.session.commit()
    return receipt
