# backend/app/models/purchase_orders.py
from datetime import datetime
from sqlalchemy import Computed
from app.extensions import db
from app.models.enums import POStatus


class PurchaseOrder(db.Model):
    __tablename__ = 'purchase_orders'

    purchase_order_id = db.Column(db.Integer, primary_key=True)
    supplier_id       = db.Column(db.Integer, db.ForeignKey('suppliers.supplier_id'), nullable=False)
    requested_by      = db.Column(db.Integer, db.ForeignKey('users.user_id'),         nullable=False)
    approved_by       = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    order_date        = db.Column(db.DateTime, default=datetime.utcnow)
    expected_delivery = db.Column(db.Date)
    total_amount      = db.Column(db.Numeric(12, 2), default=0)
    status            = db.Column(db.Enum(POStatus), default=POStatus.DRAFT)
    approved_at       = db.Column(db.DateTime)
    rejection_reason  = db.Column(db.Text)
    notes             = db.Column(db.Text)
    created_at        = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at        = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    supplier   = db.relationship('Supplier', foreign_keys=[supplier_id])
    requester  = db.relationship('User',     foreign_keys=[requested_by])
    approver   = db.relationship('User',     foreign_keys=[approved_by])
    items      = db.relationship('PurchaseOrderItem', back_populates='purchase_order',
                                  lazy='joined', cascade='all, delete-orphan')


class PurchaseOrderItem(db.Model):
    __tablename__ = 'purchase_order_items'

    po_item_id        = db.Column(db.Integer, primary_key=True)
    purchase_order_id = db.Column(db.Integer, db.ForeignKey('purchase_orders.purchase_order_id'), nullable=False)
    product_id        = db.Column(db.Integer, db.ForeignKey('products.product_id'),               nullable=False)
    quantity          = db.Column(db.Integer,        nullable=False)
    unit_price        = db.Column(db.Numeric(10, 2), nullable=False)
    # GENERATED column — same pattern as SaleItem.subtotal
    subtotal          = db.Column(
        db.Numeric(12, 2),
        Computed('quantity * unit_price', persisted=True)
    )

    purchase_order = db.relationship('PurchaseOrder', back_populates='items')
    product        = db.relationship('Product', lazy='joined')
