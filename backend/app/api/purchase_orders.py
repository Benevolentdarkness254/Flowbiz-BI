# backend/app/api/purchase_orders.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from datetime import datetime
from marshmallow import ValidationError
from app.api.decorators import require_permission
from app.models.purchase_orders import PurchaseOrder, PurchaseOrderItem
from app.models.enums import POStatus
from app.extensions import db

po_bp = Blueprint('purchase_orders', __name__)


@po_bp.get('/')
@require_permission('po.view')
def list_pos():
    pos = PurchaseOrder.query.order_by(PurchaseOrder.order_date.desc()).all()
    return jsonify(purchase_orders=[_serialize_po(p) for p in pos])


@po_bp.post('/')
@require_permission('po.create')
def create_po():
    data     = request.get_json() or {}
    identity = get_jwt_identity()
    po = PurchaseOrder(
        supplier_id   = data['supplier_id'],
        requested_by  = identity['user_id'],
        expected_delivery = data.get('expected_delivery'),
        notes         = data.get('notes'),
        status        = POStatus.PENDING_APPROVAL,
    )
    db.session.add(po)
    db.session.flush()

    total = 0
    for item_data in data.get('items', []):
        item = PurchaseOrderItem(
            purchase_order_id = po.purchase_order_id,
            product_id        = item_data['product_id'],
            quantity          = item_data['quantity'],
            unit_price        = item_data['unit_price'],
        )
        db.session.add(item)
        total += item_data['quantity'] * item_data['unit_price']

    po.total_amount = total
    db.session.commit()
    return jsonify(purchase_order=_serialize_po(po)), 201


@po_bp.post('/<int:po_id>/approve')
@require_permission('po.approve')
def approve_po(po_id):
    identity = get_jwt_identity()
    po = db.session.get(PurchaseOrder, po_id)
    if not po:
        return jsonify(error='Purchase order not found'), 404
    if po.status != POStatus.PENDING_APPROVAL:
        return jsonify(error='Only pending orders can be approved'), 422

    po.status      = POStatus.APPROVED
    po.approved_by = identity['user_id']
    po.approved_at = datetime.utcnow()
    db.session.commit()
    return jsonify(message='Purchase order approved')


@po_bp.post('/<int:po_id>/decline')
@require_permission('po.approve')
def decline_po(po_id):
    data     = request.get_json() or {}
    identity = get_jwt_identity()
    po = db.session.get(PurchaseOrder, po_id)
    if not po:
        return jsonify(error='Purchase order not found'), 404

    reason = data.get('reason')
    if not reason:
        return jsonify(error='A reason is required when declining'), 400

    po.status           = POStatus.DECLINED
    po.approved_by      = identity['user_id']
    po.approved_at      = datetime.utcnow()
    po.rejection_reason = reason
    db.session.commit()
    return jsonify(message='Purchase order declined')


def _serialize_po(po: PurchaseOrder) -> dict:
    return {
        'purchase_order_id': po.purchase_order_id,
        'supplier_id':       po.supplier_id,
        'status':            po.status.value,
        'total_amount':      float(po.total_amount),
        'order_date':        po.order_date.isoformat(),
        'expected_delivery': po.expected_delivery.isoformat() if po.expected_delivery else None,
        'approved_at':       po.approved_at.isoformat() if po.approved_at else None,
        'rejection_reason':  po.rejection_reason,
        'items': [{
            'product_id': i.product_id,
            'quantity':   i.quantity,
            'unit_price': float(i.unit_price),
            'subtotal':   float(i.subtotal),
        } for i in po.items],
    }