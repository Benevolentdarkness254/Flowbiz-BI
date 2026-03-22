# backend/app/api/bi.py
from flask import Blueprint, jsonify, request
from marshmallow import ValidationError
from datetime import date, timedelta
from app.api.decorators import require_permission
from app.services.bi_service import (
    get_revenue_summary, get_customer_summary,
    get_kra_queue, get_dashboard_stats
)
from app.schemas.bi import DateRangeSchema

bi_bp = Blueprint('bi', __name__)
date_range_schema = DateRangeSchema()


@bi_bp.get('/dashboard')
@require_permission('report.view')
def dashboard():
    """Today's key metrics — revenue, transactions, stock alerts, pending POs."""
    return jsonify(stats=get_dashboard_stats())


@bi_bp.get('/revenue')
@require_permission('report.view')
def revenue():
    """Revenue summary for a date range. Defaults to last 30 days."""
    try:
        params = date_range_schema.load(request.args)
    except ValidationError:
        # default to last 30 days if no params provided
        params = {
            'start_date': date.today() - timedelta(days=30),
            'end_date':   date.today(),
        }
    data = get_revenue_summary(params['start_date'], params['end_date'])
    return jsonify(revenue=data)


@bi_bp.get('/customers')
@require_permission('report.view')
def customers():
    """Customer lifetime value summary."""
    return jsonify(customers=get_customer_summary())


@bi_bp.get('/kra-queue')
@require_permission('report.view')
def kra_queue():
    """Invoices pending or failed KRA eTIMS submission."""
    return jsonify(queue=get_kra_queue())