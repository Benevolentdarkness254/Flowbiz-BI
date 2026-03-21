from datetime import datetime
from sqlalchemy import Index
from app.extensions import db
from app.models.enums import ProductCategory, StockMovementType, SupplierType


class Supplier(db.Model):
    __tablename__ = 'suppliers'

    supplier_id   = db.Column(db.Integer,     primary_key=True)
    name          = db.Column(db.String(100), nullable=False)
    supplier_type = db.Column(db.Enum(SupplierType), nullable=False)
    kra_pin       = db.Column(db.String(20))
    payment_terms = db.Column(db.Integer, default=30)  # net days
    is_active     = db.Column(db.Boolean, default=True)
    address       = db.Column(db.Text)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at    = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at    = db.Column(db.DateTime)

    contacts = db.relationship('SupplierContact', back_populates='supplier',
                               cascade='all, delete-orphan')


class SupplierContact(db.Model):
    __tablename__ = 'supplier_contacts'

    contact_id   = db.Column(db.Integer,     primary_key=True)
    supplier_id  = db.Column(db.Integer, db.ForeignKey('suppliers.supplier_id'), nullable=False)
    contact_name = db.Column(db.String(100), nullable=False)
    role         = db.Column(db.String(50))
    phone        = db.Column(db.String(20))
    email        = db.Column(db.String(100))
    is_primary   = db.Column(db.Boolean, default=False)

    supplier = db.relationship('Supplier', back_populates='contacts')


class Product(db.Model):
    __tablename__ = 'products'

    product_id        = db.Column(db.Integer,     primary_key=True)
    sku               = db.Column(db.String(50),  nullable=False, unique=True)
    name              = db.Column(db.String(150), nullable=False)
    description       = db.Column(db.Text)
    category          = db.Column(db.Enum(ProductCategory), nullable=False)
    unit_of_measure   = db.Column(db.String(20),  nullable=False)
    is_refill         = db.Column(db.Boolean, default=False)
    price             = db.Column(db.Numeric(10, 2), nullable=False)
    container_deposit = db.Column(db.Numeric(10, 2), default=0)
    current_stock     = db.Column(db.Integer, default=0)
    min_stock_level   = db.Column(db.Integer, default=0)
    reorder_qty       = db.Column(db.Integer, default=0)
    is_active         = db.Column(db.Boolean, default=True)
    created_at        = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at        = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at        = db.Column(db.DateTime)

    def is_low_stock(self) -> bool:
        return self.current_stock <= self.min_stock_level


class InventoryMovement(db.Model):

    __tablename__ = 'inventory_movements'

    movement_id     = db.Column(db.BigInteger,  primary_key=True)
    product_id      = db.Column(db.Integer, db.ForeignKey('products.product_id'), nullable=False)
    movement_type   = db.Column(db.Enum(StockMovementType), nullable=False)
    reference_type  = db.Column(db.String(50))
    reference_id    = db.Column(db.Integer)
    quantity_change = db.Column(db.Integer, nullable=False)
    stock_after     = db.Column(db.Integer, nullable=False)
    performed_by    = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    notes           = db.Column(db.Text)
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)

    product      = db.relationship('Product')
    performed_by_user = db.relationship('User', foreign_keys=[performed_by])


class StockAlert(db.Model):
    __tablename__ = 'stock_alerts'

    alert_id      = db.Column(db.Integer, primary_key=True)
    product_id    = db.Column(db.Integer, db.ForeignKey('products.product_id'), nullable=False)
    alert_type    = db.Column(db.Enum('low_stock', 'out_of_stock', 'reorder_triggered',
                                       name='alert_type_enum'), nullable=False)
    current_stock = db.Column(db.Integer, nullable=False)
    threshold     = db.Column(db.Integer, nullable=False)
    is_resolved   = db.Column(db.Boolean, default=False)
    resolved_at   = db.Column(db.DateTime)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    product = db.relationship('Product')
