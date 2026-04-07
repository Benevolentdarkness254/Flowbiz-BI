# backend/app/api/sales.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from marshmallow import ValidationError
from app.api.decorators import require_permission
from app.services.sales_service import create_sale
from app.schemas.sales import CreateSaleSchema, SaleTransactionSchema, CustomerSchema
from app.models.sales import SaleTransaction, Customer
from app.extensions import db

sales_bp = Blueprint("sales", __name__)

create_sale_schema = CreateSaleSchema()
txn_schema = SaleTransactionSchema()
customer_schema = CustomerSchema()


@sales_bp.post("/transactions")
@require_permission("sale.create")
def create_transaction():
    """
    Create a sale transaction with optional outbound delivery.
    If delivery_driver_id and delivery_date are provided, a delivery is created.
    """
    try:
        data = create_sale_schema.load(request.get_json() or {})
    except ValidationError as e:
        return jsonify(errors=e.messages), 400

    identity = get_jwt_identity()
    try:
        txn, delivery_id = create_sale(data, staff_user_id=int(identity))
    except ValueError as e:
        return jsonify(error=str(e)), 422

    response = {"transaction": txn_schema.dump(txn)}
    if delivery_id:
        response["delivery_id"] = delivery_id
        response["message"] = "Sale completed and delivery scheduled"
    return jsonify(response), 201


@sales_bp.get("/transactions")
@require_permission("sale.view")
def list_transactions():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 25, type=int)

    pagination = SaleTransaction.query.order_by(
        SaleTransaction.transaction_date.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify(
        transactions=txn_schema.dump(pagination.items, many=True),
        total=pagination.total,
        page=pagination.page,
        pages=pagination.pages,
    )


@sales_bp.get("/transactions/<int:txn_id>")
@require_permission("sale.view")
def get_transaction(txn_id):
    txn = db.session.get(SaleTransaction, txn_id)
    if not txn:
        return jsonify(error="Transaction not found"), 404
    return jsonify(transaction=txn_schema.dump(txn))


@sales_bp.get("/customers")
@require_permission("customer.manage")
def list_customers():
    customers = Customer.query.filter_by(deleted_at=None, is_active=True).all()
    return jsonify(customers=customer_schema.dump(customers, many=True))


@sales_bp.post("/customers")
@require_permission("customer.manage")
def create_customer():
    """Create a new customer record."""
    from app.schemas.sales import CustomerSchema as CS
    from app.models.enums import CustomerType

    data = request.get_json() or {}

    # Convert customer_type string to Enum before schema loading
    if "customer_type" in data and isinstance(data["customer_type"], str):
        try:
            data["customer_type"] = CustomerType(data["customer_type"])
        except ValueError:
            data["customer_type"] = CustomerType.WALK_IN

    schema = CS()
    try:
        customer = schema.load(data)
    except ValidationError as e:
        return jsonify(errors=e.messages), 400

    db.session.add(customer)
    db.session.commit()
    return jsonify(customer=schema.dump(customer)), 201


@sales_bp.get("/customers/<int:customer_id>")
@require_permission("customer.manage")
def get_customer(customer_id):
    """Get a single customer by ID."""
    customer = db.session.get(Customer, customer_id)
    if not customer or customer.deleted_at:
        return jsonify(error="Customer not found"), 404
    return jsonify(customer=customer_schema.dump(customer))


@sales_bp.put("/customers/<int:customer_id>")
@require_permission("customer.manage")
def update_customer(customer_id):
    """Update an existing customer record."""
    from app.models.enums import CustomerType

    customer = db.session.get(Customer, customer_id)
    if not customer or customer.deleted_at:
        return jsonify(error="Customer not found"), 404

    data = request.get_json() or {}
    if "name" in data:
        customer.name = data["name"]
    if "customer_type" in data:
        try:
            customer.customer_type = CustomerType(data["customer_type"])
        except ValueError:
            customer.customer_type = CustomerType.WALK_IN
    if "phone" in data:
        customer.phone = data["phone"]
    if "email" in data:
        customer.email = data["email"]
    if "address" in data:
        customer.address = data["address"]
    if "zone" in data:
        customer.zone = data["zone"]
    if "credit_limit" in data:
        customer.credit_limit = data["credit_limit"]
    if "kra_pin" in data:
        customer.kra_pin = data["kra_pin"]

    db.session.commit()
    return jsonify(customer=customer_schema.dump(customer))


@sales_bp.delete("/customers/<int:customer_id>")
@require_permission("customer.manage")
def delete_customer(customer_id):
    """Soft-delete a customer by setting deleted_at timestamp."""
    from datetime import datetime

    customer = db.session.get(Customer, customer_id)
    if not customer or customer.deleted_at:
        return jsonify(error="Customer not found"), 404

    customer.deleted_at = datetime.utcnow()
    db.session.commit()
    return jsonify(message="Customer deleted")


@sales_bp.get("/drivers")
@require_permission("delivery.outbound.create")
def list_drivers_for_sale():
    """
    Return list of users with the driver role.
    Used by the sales staff to assign a driver when creating a delivery during a sale.
    """
    from sqlalchemy import text

    result = db.session.execute(
        text("""
        SELECT u.user_id, u.full_name, u.phone
        FROM users u
        JOIN roles r ON r.role_id = u.role_id
        WHERE u.is_active = TRUE AND u.deleted_at IS NULL
          AND r.role_name = 'driver'
        ORDER BY u.full_name
    """)
    )
    drivers = [dict(row._mapping) for row in result]
    return jsonify(drivers=drivers)
