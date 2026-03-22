# backend/app/schemas/inventory.py
from marshmallow import fields, validate, validates, ValidationError
from flask_marshmallow import Marshmallow
from app.models.inventory import Product, Supplier
from app.models.enums import ProductCategory, SupplierType, StockMovementType

ma = Marshmallow()


class ProductSchema(ma.SQLAlchemyAutoSchema):
    """
    Serializes a Product object to JSON.
    Used for GET responses — reading product data.
    """
    class Meta:
        model         = Product
        exclude       = ('deleted_at',)
        load_instance = True

    # Enum fields need special handling — SQLAlchemy stores the enum member
    # but JSON needs the string value e.g. 'packaged_water' not 'ProductCategory.PACKAGED_WATER'
    category        = fields.Method('get_category')
    stock_status    = fields.Method('get_stock_status')

    def get_category(self, obj):
        return obj.category.value if obj.category else None

    def get_stock_status(self, obj):
        if obj.current_stock <= 0:
            return 'out_of_stock'
        elif obj.current_stock <= obj.min_stock_level:
            return 'low_stock'
        return 'ok'


class CreateProductSchema(ma.Schema):
    """
    Validates the request body when creating or updating a product.
    Separate from ProductSchema because input validation rules differ
    from output serialization rules.
    """
    sku               = fields.Str(required=True,
                                    validate=validate.Length(min=1, max=50))
    name              = fields.Str(required=True,
                                    validate=validate.Length(min=1, max=150))
    description       = fields.Str(load_default=None)
    category          = fields.Str(required=True,
                                    validate=validate.OneOf(
                                        [c.value for c in ProductCategory]
                                    ))
    unit_of_measure   = fields.Str(required=True,
                                    validate=validate.Length(min=1, max=20))
    is_refill         = fields.Bool(load_default=False)
    price             = fields.Decimal(required=True, as_string=True,
                                        validate=validate.Range(min=0))
    container_deposit = fields.Decimal(load_default='0', as_string=True)
    min_stock_level   = fields.Int(load_default=0,
                                    validate=validate.Range(min=0))
    reorder_qty       = fields.Int(load_default=0,
                                    validate=validate.Range(min=0))

    @validates('price')
    def validate_price(self, value):
        if value <= 0:
            raise ValidationError('Price must be greater than zero')


class StockAdjustSchema(ma.Schema):
    """
    Validates a manual stock adjustment request.
    quantity_change can be positive (stock in) or negative (stock out).
    A reason note is always required for manual adjustments — this creates
    an audit trail so you can explain every discrepancy to KRA if asked.
    """
    product_id      = fields.Int(required=True)
    quantity_change = fields.Int(required=True,
                                  validate=validate.Range(min=-100000, max=100000))
    notes           = fields.Str(required=True,
                                  validate=validate.Length(min=5),
                                  metadata={'description':
                                      'Reason for adjustment — required for audit trail'})

    @validates('quantity_change')
    def validate_not_zero(self, value):
        if value == 0:
            raise ValidationError('quantity_change cannot be zero')


class SupplierSchema(ma.SQLAlchemyAutoSchema):
    """Serializes a Supplier object to JSON."""
    class Meta:
        model         = Supplier
        exclude       = ('deleted_at',)
        load_instance = True

    supplier_type = fields.Method('get_supplier_type')

    def get_supplier_type(self, obj):
        return obj.supplier_type.value if obj.supplier_type else None


class CreateSupplierSchema(ma.Schema):
    """Validates supplier creation request."""
    name          = fields.Str(required=True,
                                validate=validate.Length(min=1, max=100))
    supplier_type = fields.Str(required=True,
                                validate=validate.OneOf(
                                    [s.value for s in SupplierType]
                                ))
    kra_pin       = fields.Str(load_default=None)
    payment_terms = fields.Int(load_default=30,
                                validate=validate.Range(min=0, max=365))
    address       = fields.Str(load_default=None)