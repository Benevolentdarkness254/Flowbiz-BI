from datetime import datetime
from app.extensions import db
from app.models.enums import PaymentMethod, ReceiptType, KRAStatus, DispatchChannel


class Receipt(db.Model):
    __tablename__ = "receipts"

    receipt_id = db.Column(db.Integer, primary_key=True)
    receipt_number = db.Column(db.String(50), nullable=False, unique=True)
    receipt_type = db.Column(
        db.Enum(ReceiptType, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
    )
    transaction_id = db.Column(
        db.Integer, db.ForeignKey("sale_transactions.transaction_id"), nullable=False
    )
    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.invoice_id"))
    issued_by = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    customer_id = db.Column(
        db.Integer, db.ForeignKey("customers.customer_id"), nullable=False
    )
    amount_paid = db.Column(db.Numeric(12, 2), nullable=False)
    balance_before = db.Column(db.Numeric(12, 2), nullable=False)
    balance_after = db.Column(db.Numeric(12, 2), nullable=False)
    payment_method = db.Column(
        db.Enum(PaymentMethod, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
    )
    mpesa_ref = db.Column(db.String(50))
    product_id = db.Column(
        db.Integer, db.ForeignKey("products.product_id")
    )  # for deposits
    containers_qty = db.Column(db.Integer)
    deposit_per_unit = db.Column(db.Numeric(10, 2))
    original_receipt_id = db.Column(db.Integer, db.ForeignKey("receipts.receipt_id"))
    refund_reason = db.Column(db.Text)
    kra_status = db.Column(
        db.Enum(KRAStatus, values_callable=lambda obj: [e.value for e in obj]),
        default=KRAStatus.NOT_REQUIRED,
    )
    receipt_date = db.Column(db.DateTime, default=datetime.utcnow)
    voided_at = db.Column(db.DateTime)
    voided_by = db.Column(db.Integer, db.ForeignKey("users.user_id"))
    void_reason = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Self-referential: a refund receipt points to the original payment receipt.
    # remote_side=[receipt_id] tells SQLAlchemy: "receipt_id is the ONE side,
    # original_receipt_id is the MANY side"
    original_receipt = db.relationship(
        "Receipt",
        remote_side="Receipt.receipt_id",
        foreign_keys=[original_receipt_id],
        backref=db.backref("refund_receipts", lazy="dynamic"),
    )

    customer = db.relationship("Customer", foreign_keys=[customer_id])
    issued_by_user = db.relationship("User", foreign_keys=[issued_by])
    transaction = db.relationship("SaleTransaction")


class ReceiptPrintLog(db.Model):
    """
    Every time a receipt is printed, emailed, or sent via SMS/WhatsApp, it is logged here.
    This lets the system prove what was sent, resend on request, and deal with delivery failures.
    """

    __tablename__ = "receipt_print_log"

    log_id = db.Column(db.BigInteger, primary_key=True)
    receipt_id = db.Column(db.Integer, db.ForeignKey("receipts.receipt_id"))
    dispatch_channel = db.Column(
        db.Enum(DispatchChannel, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
    )
    dispatched_to = db.Column(db.String(100))
    dispatched_by = db.Column(
        db.Integer, db.ForeignKey("users.user_id"), nullable=False
    )
    template_version = db.Column(db.String(20))
    digital_ref = db.Column(db.String(200))
    status = db.Column(
        db.Enum("queued", "sent", "delivered", "failed", name="dispatch_status_enum"),
        default="queued",
    )
    failure_reason = db.Column(db.Text)
    dispatched_at = db.Column(db.DateTime, default=datetime.utcnow)

    receipt = db.relationship("Receipt")
