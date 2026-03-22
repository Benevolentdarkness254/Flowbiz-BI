# backend/app/api/receipts.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from app.api.decorators import require_permission
from app.services.receipt_service import void_receipt
from app.models.receipts import Receipt, ReceiptPrintLog
from app.models.enums import DispatchChannel
from app.extensions import db

receipts_bp = Blueprint('receipts', __name__)


@receipts_bp.get('/')
@require_permission('receipt.issue')
def list_receipts():
    page     = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)
    pagination = (
        Receipt.query
        .filter_by(voided_at=None)
        .order_by(Receipt.receipt_date.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )
    return jsonify(
        receipts=[_serialize_receipt(r) for r in pagination.items],
        total=pagination.total,
        page=pagination.page,
    )


@receipts_bp.get('/<int:receipt_id>')
@require_permission('receipt.issue')
def get_receipt(receipt_id):
    receipt = db.session.get(Receipt, receipt_id)
    if not receipt:
        return jsonify(error='Receipt not found'), 404
    return jsonify(receipt=_serialize_receipt(receipt))


@receipts_bp.post('/<int:receipt_id>/void')
@require_permission('receipt.void')
def void(receipt_id):
    data     = request.get_json() or {}
    identity = get_jwt_identity()
    reason   = data.get('reason')
    if not reason:
        return jsonify(error='A reason is required to void a receipt'), 400
    try:
        receipt = void_receipt(receipt_id, identity['user_id'], reason)
    except ValueError as e:
        return jsonify(error=str(e)), 422
    return jsonify(message='Receipt voided', receipt_id=receipt.receipt_id)


@receipts_bp.post('/<int:receipt_id>/dispatch')
@require_permission('receipt.reprint')
def dispatch(receipt_id):
    """Queue a receipt for resend via a specific channel."""
    data     = request.get_json() or {}
    identity = get_jwt_identity()
    channel  = data.get('channel')
    if not channel or channel not in [c.value for c in DispatchChannel]:
        return jsonify(error='Invalid dispatch channel'), 400

    log = ReceiptPrintLog(
        receipt_id       = receipt_id,
        dispatch_channel = DispatchChannel(channel),
        dispatched_to    = data.get('destination'),
        dispatched_by    = identity['user_id'],
        status           = 'queued',
    )
    db.session.add(log)
    db.session.commit()
    return jsonify(message='Receipt queued for dispatch', log_id=log.log_id)


def _serialize_receipt(r: Receipt) -> dict:
    return {
        'receipt_id':     r.receipt_id,
        'receipt_number': r.receipt_number,
        'receipt_type':   r.receipt_type.value,
        'amount_paid':    float(r.amount_paid),
        'payment_method': r.payment_method.value,
        'receipt_date':   r.receipt_date.isoformat(),
        'customer_id':    r.customer_id,
        'mpesa_ref':      r.mpesa_ref,
        'kra_status':     r.kra_status.value,
        'voided':         r.voided_at is not None,
    }