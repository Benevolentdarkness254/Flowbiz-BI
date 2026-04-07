# backend/app/schemas/sales.py
from marshmallow import (
    fields,
    validate,
    validates,
    ValidationError,
    pre_load,
    post_load,
)
from flask_marshmallow import Marshmallow
from app.models.sales import Customer, SaleTransaction, SaleItem
from app.models.enums import CustomerType

ma = Marshmallow()


class SaleItemInputSchema(ma.Schema):
    """One line item in a sale request."""

    product_id = fields.Int(required=True)
    quantity = fields.Int(required=True, validate=validate.Range(min=1))
    unit_price = fields.Decimal(
        required=True, as_string=True, validate=validate.Range(min=0)
    )
    discount = fields.Decimal(load_default="0", as_string=True)


class CreateSaleSchema(ma.Schema):
    """Validates POST /api/sales/transactions."""

    customer_id = fields.Int(required=True)
    payment_method = fields.Str(
        required=True,
        validate=validate.OneOf(["cash", "mpesa", "bank_transfer", "credit", "cheque"]),
    )
    mpesa_ref = fields.Str(load_default=None)
    discount_amount = fields.Decimal(load_default="0", as_string=True)
    notes = fields.Str(load_default=None)
    items = fields.List(
        fields.Nested(SaleItemInputSchema),
        required=True,
        validate=validate.Length(min=1),
    )

    # Optional delivery fields — when present, an outbound delivery is created
    # alongside the sale transaction.
    delivery_driver_id = fields.Int(load_default=None)
    delivery_date = fields.Str(load_default=None)  # ISO date string
    delivery_zone = fields.Str(load_default=None)
    delivery_notes = fields.Str(load_default=None)

    @validates("mpesa_ref")
    def validate_mpesa_ref(self, value):
        # mpesa_ref is required when payment_method is mpesa
        # full cross-field validation happens in the route after loading
        pass


class SaleItemSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = SaleItem
        load_instance = True

    product_name = fields.Method("get_product_name")

    def get_product_name(self, obj):
        return obj.product.name if obj.product else None


class SaleTransactionSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = SaleTransaction
        load_instance = True

    customer_name = fields.Method("get_customer_name")
    items = fields.List(fields.Nested(SaleItemSchema))
    payment_method = fields.Method("get_payment_method")
    payment_status = fields.Method("get_payment_status")

    def get_customer_name(self, obj):
        return obj.customer.name if obj.customer else None

    def get_payment_method(self, obj):
        return obj.payment_method.value if obj.payment_method else None

    def get_payment_status(self, obj):
        return obj.payment_status.value if obj.payment_status else None


class CustomerSchema(ma.SQLAlchemyAutoSchema):
    """
    Schema for customer serialization and deserialization.
    Handles conversion of customer_type string to Enum for loading,
    and Enum to string for dumping.
    """

    class Meta:
        model = Customer
        exclude = ("deleted_at",)
        load_instance = True

    customer_type = fields.Str(load_default="walk_in")

    @pre_load
    def normalize_data(self, data, **kwargs):
        """
        Normalize incoming data before loading:
        - Convert credit_limit string to float
        - Convert customer_type string to Enum
        """
        # Convert credit_limit to number
        if "credit_limit" in data and isinstance(data["credit_limit"], str):
            try:
                data["credit_limit"] = float(data["credit_limit"])
            except (ValueError, TypeError):
                data["credit_limit"] = 0

        # Convert customer_type string to Enum
        if "customer_type" in data and isinstance(data["customer_type"], str):
            try:
                data["customer_type"] = CustomerType(data["customer_type"])
            except ValueError:
                data["customer_type"] = CustomerType.WALK_IN

        return data

    def get_customer_type(self, obj):
        """Serialize customer_type Enum to string for API responses."""
        return obj.customer_type.value if obj.customer_type else None
