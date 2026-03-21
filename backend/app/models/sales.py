from datetime import datetime
from sqlalchemy import Computed
from app.extensions import db
from app.models.enums import (
    PaymentMethod, PaymentStatus, CustomerType, DeliveryStatus, KRAStatus
)


class Customer(db.Model):
    __tablename__ = 'customers'

    customer_id    = db.Column(db.Integer,     primary_key=True)
    name           = db.Column(db.String(100), nullable=False)
    customer_type  = db.Column(db.Enum(CustomerType), default=CustomerType.WALK_IN)
    phone          = db.Column(db.String(20))
    email          = db.Column(db.String(100))
    address        = db.Column(db.Text)
    zone           = db.Column(db.String(50))
    credit_limit   = db.Column(db.Numeric(12, 2), default=0)
    credit_balance = db.Column(db.Numeric(12, 2), default=0)
    kra_pin        = db.Column(db.String(20))
    is_active      = db.Column(db.Boolean, default=True)
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at     = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at     = db.Column(db.DateTime)

    transactions = db.relationship('SaleTransaction', back_populates='customer',
                                    lazy='dynamic')

    def __repr__(self):
        return f'<Customer {self.name} ({self.customer_type.value})>'


class SaleTransaction(db.Model):
    __tablename__ = 'sale_transactions'

    transaction_id   = db.Column(db.Integer,  primary_key=True)
    customer_id      = db.Column(db.Integer,  db.ForeignKey('customers.customer_id'), nullable=False)
    sales_staff_id   = db.Column(db.Integer,  db.ForeignKey('users.user_id'),         nullable=False)
    transaction_date = db.Column(db.DateTime, default=datetime.utcnow)
    subtotal         = db.Column(db.Numeric(12, 2), nullable=False)
    discount_amount  = db.Column(db.Numeric(12, 2), default=0)
    tax_amount       = db.Column(db.Numeric(12, 2), default=0)
    total_amount     = db.Column(db.Numeric(12, 2), nullable=False)
    payment_method   = db.Column(db.Enum(PaymentMethod), nullable=False)
    payment_status   = db.Column(db.Enum(PaymentStatus), default=PaymentStatus.PENDING)
    mpesa_ref        = db.Column(db.String(50))
    notes            = db.Column(db.Text)
    created_at       = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at       = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # lazy='joined': always load customer and staff in the same query as the transaction
    customer    = db.relationship('Customer', back_populates='transactions', lazy='joined')
    sales_staff = db.relationship('User', foreign_keys=[sales_staff_id], lazy='joined')
    # lazy='joined': always load items with the transaction — we almost always need them
    items       = db.relationship('SaleItem', back_populates='transaction', lazy='joined',
                                   cascade='all, delete-orphan')


class SaleItem(db.Model):
    __tablename__ = 'sale_items'

    sale_item_id        = db.Column(db.Integer, primary_key=True)
    transaction_id      = db.Column(db.Integer, db.ForeignKey('sale_transactions.transaction_id'), nullable=False)
    product_id          = db.Column(db.Integer, db.ForeignKey('products.product_id'), nullable=False)
    quantity            = db.Column(db.Integer,           nullable=False)
    unit_price          = db.Column(db.Numeric(10, 2),    nullable=False)
    discount            = db.Column(db.Numeric(10, 2),    default=0)
    containers_returned = db.Column(db.Integer,           default=0)

    # GENERATED column — MySQL computed this. Computed(persisted=True) maps to STORED.
    # Never assign to this attribute. SQLAlchemy marks it as server-side only.
    subtotal = db.Column(
        db.Numeric(12, 2),
        Computed('(quantity * unit_price) - discount', persisted=True)
    )

    transaction = db.relationship('SaleTransaction', back_populates='items')
    product     = db.relationship('Product', lazy='joined')


class Invoice(db.Model):
    __tablename__ = 'invoices'

    invoice_id     = db.Column(db.Integer,     primary_key=True)
    transaction_id = db.Column(db.Integer, db.ForeignKey('sale_transactions.transaction_id'),
                                nullable=False, unique=True)
    invoice_number = db.Column(db.String(50),  nullable=False, unique=True)
    invoice_type   = db.Column(db.Enum('standard', 'credit_note', 'proforma', 'consolidated',
                                        name='invoice_type_enum'), default='standard')
    invoice_date   = db.Column(db.DateTime,    default=datetime.utcnow)
    due_date       = db.Column(db.Date)
    total_amount   = db.Column(db.Numeric(12, 2), nullable=False)
    tax_amount     = db.Column(db.Numeric(12, 2), default=0)
    kra_status     = db.Column(db.Enum(KRAStatus), default=KRAStatus.NOT_SUBMITTED)
    kra_reference  = db.Column(db.String(100),  unique=True)
    kra_submitted_at = db.Column(db.DateTime)
    kra_accepted_at  = db.Column(db.DateTime)
    kra_error_log    = db.Column(db.Text)
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at     = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    transaction = db.relationship('SaleTransaction')


class OutboundDelivery(db.Model):
    """Customer delivery — driver takes goods to customer site."""
    __tablename__ = 'outbound_deliveries'

    delivery_id        = db.Column(db.Integer, primary_key=True)
    transaction_id     = db.Column(db.Integer, db.ForeignKey('sale_transactions.transaction_id'), nullable=False)
    driver_id          = db.Column(db.Integer, db.ForeignKey('users.user_id'),                   nullable=False)
    customer_id        = db.Column(db.Integer, db.ForeignKey('customers.customer_id'),            nullable=False)
    scheduled_date     = db.Column(db.DateTime, nullable=False)
    delivered_at       = db.Column(db.DateTime)
    delivery_zone      = db.Column(db.String(50))
    status             = db.Column(db.Enum(DeliveryStatus), default=DeliveryStatus.SCHEDULED)
    delivery_notes     = db.Column(db.Text)
    signature_captured = db.Column(db.Boolean, default=False)
    created_at         = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at         = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    transaction = db.relationship('SaleTransaction')
    driver      = db.relationship('User',     foreign_keys=[driver_id])
    customer    = db.relationship('Customer', foreign_keys=[customer_id])
