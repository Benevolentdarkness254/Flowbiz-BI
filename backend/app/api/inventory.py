# backend/app/api/inventory.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from marshmallow import ValidationError
from app.api.decorators import require_permission
from app.services.bi_service import get_inventory_status
from app.services.inventory_service import adjust_stock
from app.models.inventory import Product, StockAlert
from app.models.enums import StockMovementType
from app.schemas.sales import CustomerSchema
from app.extensions import db

inventory_bp = Blueprint('inventory', __name__)


@inventory_bp.get('/products')
@require_permission('inventory.view')
def list_products():
    products = Product.query.filter_by(deleted_at=None, is_active=True).all()
    return jsonify(products=[{
        'product_id':      p.product_id,
        'sku':             p.sku,
        'name':            p.name,
        'category':        p.category.value,
        'unit_of_measure': p.unit_of_measure,
        'price':           float(p.price),
        'current_stock':   p.current_stock,
        'min_stock_level': p.min_stock_level,
        'is_refill':       p.is_refill,
        'stock_status':    'ok' if not p.is_low_stock() else 'low_stock',
    } for p in products])


@inventory_bp.get('/status')
@require_permission('inventory.view')
def inventory_status():
    """Returns the vw_inventory_status view — real-time stock with status flags."""
    data = get_inventory_status()
    return jsonify(inventory=data)


@inventory_bp.post('/adjust')
@require_permission('inventory.adjust')
def manual_adjust():
    """
    Manual stock adjustment — for corrections, write-offs, opening balances.
    Requires a reason note.
    """
    data     = request.get_json() or {}
    identity = get_jwt_identity()

    product_id      = data.get('product_id')
    quantity_change = data.get('quantity_change')
    notes           = data.get('notes')

    if not product_id or quantity_change is None or not notes:
        return jsonify(error='product_id, quantity_change, and notes are required'), 400

    try:
        movement = adjust_stock(
            product_id      = product_id,
            quantity_change = quantity_change,
            movement_type   = StockMovementType.ADJUSTMENT,
            performed_by_id = identity['user_id'],
            notes           = notes,
        )
        db.session.commit()
    except ValueError as e:
        return jsonify(error=str(e)), 422

    return jsonify(message='Stock adjusted', stock_after=movement.stock_after)


@inventory_bp.get('/alerts')
@require_permission('inventory.view')
def stock_alerts():
    alerts = StockAlert.query.filter_by(is_resolved=False).all()
    return jsonify(alerts=[{
        'alert_id':     a.alert_id,
        'product_name': a.product.name,
        'alert_type':   a.alert_type,
        'current_stock':a.current_stock,
        'threshold':    a.threshold,
        'created_at':   a.created_at.isoformat(),
    } for a in alerts])