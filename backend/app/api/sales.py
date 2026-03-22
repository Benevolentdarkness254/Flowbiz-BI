# backend/app/api/sales.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from marshmallow import ValidationError
from app.api.decorators import require_permission
from app.services.sales_service import create_sale
from app.schemas.sales import CreateSaleSchema, SaleTransactionSchema, CustomerSchema
from app.models.sales import SaleTransaction, Customer
from app.extensions import db

sales_bp = Blueprint('sales', __name__)

create_sale_schema = CreateSaleSchema()
txn_schema         = SaleTransactionSchema()
customer_schema    = CustomerSchema()


@sales_bp.post('/transactions')
@require_permission('sale.create')
def create_transaction():
    try:
        data = create_sale_schema.load(request.get_json() or {})
    except ValidationError as e:
        return jsonify(errors=e.messages), 400

    identity = get_jwt_identity()
    try:
        txn = create_sale(data, staff_user_id=identity['user_id'])
    except ValueError as e:
        return jsonify(error=str(e)), 422

    return jsonify(transaction=txn_schema.dump(txn)), 201


@sales_bp.get('/transactions')
@require_permission('sale.view')
def list_transactions():
    page     = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)

    pagination = (
        SaleTransaction.query
        .order_by(SaleTransaction.transaction_date.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )
    return jsonify(
        transactions = txn_schema.dump(pagination.items, many=True),
        total        = pagination.total,
        page         = pagination.page,
        pages        = pagination.pages,
    )


@sales_bp.get('/transactions/<int:txn_id>')
@require_permission('sale.view')
def get_transaction(txn_id):
    txn = db.session.get(SaleTransaction, txn_id)
    if not txn:
        return jsonify(error='Transaction not found'), 404
    return jsonify(transaction=txn_schema.dump(txn))


@sales_bp.get('/customers')
@require_permission('customer.manage')
def list_customers():
    customers = Customer.query.filter_by(deleted_at=None, is_active=True).all()
    return jsonify(customers=customer_schema.dump(customers, many=True))


@sales_bp.post('/customers')
@require_permission('customer.manage')
def create_customer():
    from app.schemas.sales import CustomerSchema as CS
    schema = CS()
    try:
        customer = schema.load(request.get_json() or {})
    except ValidationError as e:
        return jsonify(errors=e.messages), 400

    db.session.add(customer)
    db.session.commit()
    return jsonify(customer=schema.dump(customer)), 201