# backend/app/schemas/receipts.py
from marshmallow import fields, validate, validates, ValidationError
from flask_marshmallow import Marshmallow
from app.models.receipts import Receipt
from app.models.enums import ReceiptType, PaymentMethod, DispatchChannel

ma = Marshmallow()


class ReceiptSchema(ma.SQLAlchemyAutoSchema):
    """
    Serializes a Receipt object to JSON.
    Used for GET responses when displaying receipts to the user.
    """
    class Meta:
        model         = Receipt
        exclude       = ('voided_by',)
        load_instance = True

    # Convert enum members to their string values for JSON
    receipt_type   = fields.Method('get_receipt_type')
    payment_method = fields.Method('get_payment_method')
    kra_status     = fields.Method('get_kra_status')
    is_voided      = fields.Method('get_is_voided')

    # Nested customer name for display — avoids a separate API call
    customer_name  = fields.Method('get_customer_name')

    def get_receipt_type(self, obj):
        return obj.receipt_type.value if obj.receipt_type else None

    def get_payment_method(self, obj):
        return obj.payment_method.value if obj.payment_method else None

    def get_kra_status(self, obj):
        return obj.kra_status.value if obj.kra_status else None

    def get_is_voided(self, obj):
        # cleaner than exposing the raw voided_at timestamp to the frontend
        return obj.voided_at is not None

    def get_customer_name(self, obj):
        return obj.customer.name if obj.customer else None


class DispatchReceiptSchema(ma.Schema):
    """
    Validates a receipt dispatch request.
    Used when a cashier triggers a resend via SMS, WhatsApp, email, or thermal printer.
    """
    channel     = fields.Str(required=True,
                               validate=validate.OneOf(
                                   [c.value for c in DispatchChannel]
                               ))
    destination = fields.Str(load_default=None)

    @validates('destination')
    def validate_destination(self, value):
        # destination is required for all channels except digital_only
        # cross-field validation is handled in the route after loading
        pass


class VoidReceiptSchema(ma.Schema):
    """Validates a void receipt request. A reason is always required."""
    reason = fields.Str(required=True,
                         validate=validate.Length(
                             min=5,
                             error='Void reason must be at least 5 characters'
                         ))


class ContainerDepositReceiptSchema(ma.Schema):
    """
    Validates a container deposit receipt request.
    Issued when a customer pays a deposit on returnable containers
    like 20L jerricans.
    """
    transaction_id  = fields.Int(required=True)
    product_id      = fields.Int(required=True)
    containers_qty  = fields.Int(required=True,
                                  validate=validate.Range(min=1))
    payment_method  = fields.Str(required=True,
                                  validate=validate.OneOf(
                                      [p.value for p in PaymentMethod]
                                  ))
    mpesa_ref       = fields.Str(load_default=None)