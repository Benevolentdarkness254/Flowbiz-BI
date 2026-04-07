# backend/app/api/bi.py
from flask import Blueprint, jsonify, request
from marshmallow import ValidationError
from datetime import date, timedelta
from app.api.decorators import require_permission
from app.services.bi_service import (
    get_revenue_summary,
    get_customer_summary,
    get_kra_queue,
    get_dashboard_stats,
    get_business_overview,
    get_delivery_analytics,
    get_po_analytics,
    get_hr_analytics,
)
from app.schemas.bi import DateRangeSchema

bi_bp = Blueprint("bi", __name__)
date_range_schema = DateRangeSchema()


@bi_bp.get("/dashboard")
@require_permission("report.view")
def dashboard():
    """Today's key metrics — revenue, transactions, stock alerts, pending POs."""
    return jsonify(stats=get_dashboard_stats())


@bi_bp.get("/revenue")
@require_permission("report.view")
def revenue():
    """Revenue summary for a date range. Defaults to last 30 days."""
    try:
        params = date_range_schema.load(request.args)
    except ValidationError:
        params = {}
    start = params.get("start_date") or date.today() - timedelta(days=30)
    end = params.get("end_date") or date.today()
    data = get_revenue_summary(start, end)
    return jsonify(revenue=data)


@bi_bp.get("/customers")
@require_permission("report.view")
def customers():
    """Customer lifetime value summary."""
    return jsonify(customers=get_customer_summary())


@bi_bp.get("/kra-queue")
@require_permission("report.view")
def kra_queue():
    """Invoices pending or failed KRA eTIMS submission."""
    return jsonify(queue=get_kra_queue())


@bi_bp.get("/overview")
@require_permission("report.view")
def overview():
    """Bird's-eye business overview: sales, inventory, deliveries, POs, users, receipts."""
    try:
        params = date_range_schema.load(request.args)
    except ValidationError:
        params = {}
    start = params.get("start_date") or date.today() - timedelta(days=30)
    end = params.get("end_date") or date.today()
    return jsonify(data=get_business_overview(start, end))


@bi_bp.get("/deliveries/analytics")
@require_permission("report.view")
def delivery_analytics():
    """Delivery status, driver performance, zone stats, and delivery log."""
    return jsonify(data=get_delivery_analytics())


@bi_bp.get("/purchase-orders/analytics")
@require_permission("report.view")
def po_analytics():
    """PO pipeline, supplier performance, and recent orders."""
    return jsonify(data=get_po_analytics())


@bi_bp.get("/hr/analytics")
@require_permission("report.view")
def hr_analytics():
    """User activity, staff performance, and team overview."""
    return jsonify(data=get_hr_analytics())


@bi_bp.get("/dashboard/sales")
@require_permission("sale.view")
def dashboard_sales():
    """
    Sales-focused dashboard for sales staff.
    Returns today's sales, top products, recent transactions, payment method breakdown,
    daily sales trend, and payment status distribution.
    """
    from app.services.bi_service import get_dashboard_stats
    from app.models.sales import SaleTransaction, SaleItem
    from app.models.inventory import Product
    from app.extensions import db
    from sqlalchemy import func
    from datetime import datetime, timedelta

    stats = get_dashboard_stats()
    today = datetime.utcnow().date()
    week_ago = today - timedelta(days=7)

    # Top selling products today
    top_products = (
        db.session.query(
            SaleItem.product_id,
            func.sum(SaleItem.quantity).label("total_qty"),
            func.sum(SaleItem.subtotal).label("total_revenue"),
        )
        .join(
            SaleTransaction, SaleItem.transaction_id == SaleTransaction.transaction_id
        )
        .filter(func.date(SaleTransaction.transaction_date) == today)
        .group_by(SaleItem.product_id)
        .order_by(func.sum(SaleItem.quantity).desc())
        .limit(5)
        .all()
    )

    top_products_list = []
    for row in top_products:
        product = db.session.get(Product, row.product_id)
        if product:
            top_products_list.append(
                {
                    "product_id": row.product_id,
                    "name": product.name,
                    "sku": product.sku,
                    "total_qty": int(row.total_qty),
                    "total_revenue": float(row.total_revenue),
                }
            )

    # Recent transactions
    recent_txns = (
        SaleTransaction.query.order_by(SaleTransaction.transaction_date.desc())
        .limit(10)
        .all()
    )

    recent_list = []
    for txn in recent_txns:
        recent_list.append(
            {
                "transaction_id": txn.transaction_id,
                "customer_name": txn.customer.name if txn.customer else "Unknown",
                "total_amount": float(txn.total_amount),
                "payment_method": txn.payment_method.value
                if hasattr(txn.payment_method, "value")
                else txn.payment_method,
                "payment_status": txn.payment_status.value
                if hasattr(txn.payment_status, "value")
                else txn.payment_status,
                "transaction_date": txn.transaction_date.isoformat(),
            }
        )

    # Payment method breakdown (all time)
    payment_methods = (
        db.session.query(
            SaleTransaction.payment_method,
            func.count(SaleTransaction.transaction_id).label("count"),
            func.sum(SaleTransaction.total_amount).label("total"),
        )
        .group_by(SaleTransaction.payment_method)
        .all()
    )

    payment_method_chart = []
    for row in payment_methods:
        method = (
            row.payment_method.value
            if hasattr(row.payment_method, "value")
            else row.payment_method
        )
        payment_method_chart.append(
            {
                "name": method.replace("_", " ").title(),
                "count": row.count,
                "total": float(row.total) if row.total else 0,
            }
        )

    # Daily sales trend (last 7 days)
    daily_sales = (
        db.session.query(
            func.date(SaleTransaction.transaction_date).label("sale_date"),
            func.count(SaleTransaction.transaction_id).label("txn_count"),
            func.sum(SaleTransaction.total_amount).label("daily_total"),
        )
        .filter(func.date(SaleTransaction.transaction_date) >= week_ago)
        .group_by(func.date(SaleTransaction.transaction_date))
        .order_by(func.date(SaleTransaction.transaction_date))
        .all()
    )

    daily_sales_chart = []
    for row in daily_sales:
        daily_sales_chart.append(
            {
                "date": str(row.sale_date),
                "transactions": row.txn_count,
                "revenue": float(row.daily_total) if row.daily_total else 0,
            }
        )

    # Payment status distribution
    payment_status = (
        db.session.query(
            SaleTransaction.payment_status,
            func.count(SaleTransaction.transaction_id).label("count"),
        )
        .group_by(SaleTransaction.payment_status)
        .all()
    )

    payment_status_chart = []
    for row in payment_status:
        status = (
            row.payment_status.value
            if hasattr(row.payment_status, "value")
            else row.payment_status
        )
        payment_status_chart.append(
            {
                "name": status.replace("_", " ").title(),
                "count": row.count,
            }
        )

    return jsonify(
        stats=stats,
        top_products=top_products_list,
        recent_transactions=recent_list,
        payment_method_breakdown=payment_method_chart,
        daily_sales_trend=daily_sales_chart,
        payment_status_distribution=payment_status_chart,
    )


@bi_bp.get("/dashboard/inventory")
@require_permission("inventory.view")
def dashboard_inventory():
    """
    Inventory-focused dashboard for inventory staff.
    Returns stock levels, alerts, recent movements, pending inbound deliveries,
    stock by category chart, and movement type distribution.
    """
    from app.services.bi_service import get_inventory_status
    from app.models.inventory import StockAlert, InventoryMovement, Product
    from app.extensions import db
    from sqlalchemy import text, func

    inventory = get_inventory_status()

    # Unresolved alerts
    alerts = StockAlert.query.filter_by(is_resolved=False).all()
    alerts_list = []
    for a in alerts:
        product = db.session.get(Product, a.product_id)
        alerts_list.append(
            {
                "alert_id": a.alert_id,
                "product_name": product.name if product else "Unknown",
                "alert_type": a.alert_type.value
                if hasattr(a.alert_type, "value")
                else a.alert_type,
                "current_stock": a.current_stock,
                "threshold": a.threshold,
            }
        )

    # Recent stock movements
    movements = (
        InventoryMovement.query.order_by(InventoryMovement.created_at.desc())
        .limit(15)
        .all()
    )

    movements_list = []
    for m in movements:
        product = db.session.get(Product, m.product_id)
        movements_list.append(
            {
                "movement_id": m.movement_id,
                "product_name": product.name if product else "Unknown",
                "movement_type": m.movement_type.value
                if hasattr(m.movement_type, "value")
                else m.movement_type,
                "quantity_change": m.quantity_change,
                "stock_after": m.stock_after,
                "notes": m.notes,
                "created_at": m.created_at.isoformat(),
            }
        )

    # Pending inbound deliveries
    pending_inbound = db.session.execute(
        text("""
        SELECT id.delivery_id, s.name AS supplier_name, id.delivery_date, id.status,
               (SELECT COUNT(*) FROM inbound_delivery_items idi WHERE idi.delivery_id = id.delivery_id) AS item_count
        FROM inbound_deliveries id
        JOIN suppliers s ON s.supplier_id = id.supplier_id
        WHERE id.status IN ('pending', 'partial')
        ORDER BY id.delivery_date DESC
        LIMIT 10
    """)
    ).fetchall()

    pending_list = [dict(row._mapping) for row in pending_inbound]
    for d in pending_list:
        if d.get("delivery_date"):
            d["delivery_date"] = d["delivery_date"].isoformat()

    # Stock by category chart
    stock_by_category = db.session.execute(
        text("""
        SELECT p.category, COUNT(*) AS product_count, SUM(p.current_stock) AS total_stock,
               SUM(p.current_stock * p.price) AS total_value
        FROM products p
        WHERE p.deleted_at IS NULL AND p.is_active = TRUE
        GROUP BY p.category
        ORDER BY total_value DESC
    """)
    ).fetchall()

    stock_category_chart = []
    for row in stock_by_category:
        stock_category_chart.append(
            {
                "category": row.category.replace("_", " ").title(),
                "products": row.product_count,
                "total_stock": row.total_stock or 0,
                "total_value": float(row.total_value) if row.total_value else 0,
            }
        )

    # Movement type distribution (last 30 days)
    movement_distribution = db.session.execute(
        text("""
        SELECT movement_type, COUNT(*) AS count, SUM(ABS(quantity_change)) AS total_units
        FROM inventory_movements
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY movement_type
        ORDER BY count DESC
    """)
    ).fetchall()

    movement_type_chart = []
    for row in movement_distribution:
        movement_type_chart.append(
            {
                "type": row.movement_type.replace("_", " ").title(),
                "count": row.count,
                "total_units": row.total_units or 0,
            }
        )

    # Stock level distribution (ok, low, out)
    stock_levels = db.session.execute(
        text("""
        SELECT
            SUM(CASE WHEN current_stock = 0 THEN 1 ELSE 0 END) AS out_of_stock,
            SUM(CASE WHEN current_stock > 0 AND current_stock <= min_stock_level THEN 1 ELSE 0 END) AS low_stock,
            SUM(CASE WHEN current_stock > min_stock_level THEN 1 ELSE 0 END) AS healthy
        FROM products
        WHERE deleted_at IS NULL AND is_active = TRUE
    """)
    ).first()

    stock_level_chart = [
        {"name": "Healthy", "value": stock_levels.healthy or 0},
        {"name": "Low Stock", "value": stock_levels.low_stock or 0},
        {"name": "Out of Stock", "value": stock_levels.out_of_stock or 0},
    ]

    return jsonify(
        inventory=inventory,
        alerts=alerts_list,
        recent_movements=movements_list,
        pending_inbound=pending_list,
        stock_by_category=stock_category_chart,
        movement_type_distribution=movement_type_chart,
        stock_level_distribution=stock_level_chart,
    )


@bi_bp.get("/dashboard/driver")
@require_permission("delivery.outbound.view")
def dashboard_driver():
    """
    Driver-focused dashboard.
    Returns today's assigned deliveries, status breakdown, delivery notes,
    weekly delivery trend, and zone distribution.
    """
    from flask_jwt_extended import get_jwt_identity
    from app.models.sales import OutboundDelivery
    from app.extensions import db
    from sqlalchemy import text, func
    from datetime import datetime, timedelta

    user_id = int(get_jwt_identity())

    # Today's deliveries for this driver
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0)
    today_end = datetime.utcnow().replace(hour=23, minute=59, second=59)

    deliveries = (
        OutboundDelivery.query.filter(
            OutboundDelivery.driver_id == user_id,
            OutboundDelivery.scheduled_date >= today_start,
            OutboundDelivery.scheduled_date <= today_end,
        )
        .order_by(OutboundDelivery.scheduled_date)
        .all()
    )

    deliveries_list = []
    for d in deliveries:
        deliveries_list.append(
            {
                "delivery_id": d.delivery_id,
                "customer_name": d.customer.name if d.customer else "Unknown",
                "customer_phone": d.customer.phone if d.customer else None,
                "customer_address": d.customer.address if d.customer else None,
                "delivery_zone": d.delivery_zone,
                "status": d.status.value if d.status else None,
                "scheduled_date": d.scheduled_date.isoformat(),
                "delivery_notes": d.delivery_notes,
                "transaction_id": d.transaction_id,
            }
        )

    # Status breakdown
    status_counts = {}
    for d in deliveries:
        status = d.status.value if d.status else "unknown"
        status_counts[status] = status_counts.get(status, 0) + 1

    # Weekly delivery trend (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    weekly_trend = db.session.execute(
        text("""
        SELECT DATE(scheduled_date) AS day, status, COUNT(*) AS count
        FROM outbound_deliveries
        WHERE driver_id = :driver_id AND scheduled_date >= :week_ago
        GROUP BY DATE(scheduled_date), status
        ORDER BY day
    """),
        {"driver_id": user_id, "week_ago": week_ago},
    ).fetchall()

    # Aggregate by day
    daily_counts = {}
    for row in weekly_trend:
        day_str = str(row.day)
        if day_str not in daily_counts:
            daily_counts[day_str] = {
                "date": day_str,
                "delivered": 0,
                "failed": 0,
                "total": 0,
            }
        daily_counts[day_str]["total"] += row.count
        if row.status == "delivered":
            daily_counts[day_str]["delivered"] = row.count
        elif row.status == "failed":
            daily_counts[day_str]["failed"] = row.count

    weekly_chart = sorted(daily_counts.values(), key=lambda x: x["date"])

    # Zone distribution for this driver
    zone_dist = db.session.execute(
        text("""
        SELECT delivery_zone, COUNT(*) AS count
        FROM outbound_deliveries
        WHERE driver_id = :driver_id AND scheduled_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY delivery_zone
        ORDER BY count DESC
    """),
        {"driver_id": user_id},
    ).fetchall()

    zone_chart = [
        {"zone": row.delivery_zone or "Unknown", "count": row.count}
        for row in zone_dist
    ]

    return jsonify(
        deliveries=deliveries_list,
        total=len(deliveries_list),
        status_breakdown=status_counts,
        weekly_trend=weekly_chart,
        zone_distribution=zone_chart,
    )


@bi_bp.get("/dashboard/admin")
@require_permission("system.config")
def dashboard_admin():
    """
    Admin/IT-focused dashboard with system health metrics.
    Returns database stats, user activity, error rates, backup status, KRA status,
    plus chart data for system activity, user roles distribution, and recent audit activity.
    """
    from app.services.bi_service import get_dashboard_stats
    from app.extensions import db
    from sqlalchemy import text, func
    from app.models.auth import User, Role
    from datetime import datetime, timedelta

    stats = get_dashboard_stats()

    # Database size
    db_size = db.session.execute(
        text("""
        SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
    """)
    ).scalar()

    # User counts
    total_users = User.query.filter_by(deleted_at=None).count()
    active_users = User.query.filter_by(deleted_at=None, is_active=True).count()
    recent_logins = User.query.filter(
        User.last_login_at >= datetime.utcnow() - timedelta(days=7),
        User.deleted_at.is_(None),
    ).count()

    # Recent audit log errors (failed actions)
    error_count = db.session.execute(
        text("""
        SELECT COUNT(*) FROM audit_log
        WHERE created_at >= :cutoff
          AND (action LIKE '%fail%' OR action LIKE '%error%' OR action LIKE '%reject%')
    """),
        {"cutoff": datetime.utcnow() - timedelta(days=1)},
    ).scalar()

    # KRA queue status
    kra_pending = db.session.execute(
        text("""
        SELECT COUNT(*) FROM invoices WHERE kra_status IN ('not_submitted', 'pending', 'rejected')
    """)
    ).scalar()

    # Stock alerts count
    stock_alerts = db.session.execute(
        text("""
        SELECT COUNT(*) FROM stock_alerts WHERE is_resolved = FALSE
    """)
    ).scalar()

    # Pending POs
    pending_pos = db.session.execute(
        text("""
        SELECT COUNT(*) FROM purchase_orders WHERE status = 'pending_approval'
    """)
    ).scalar()

    # Active deliveries
    active_deliveries = db.session.execute(
        text("""
        SELECT COUNT(*) FROM outbound_deliveries WHERE status IN ('scheduled', 'in_transit')
    """)
    ).scalar()

    # User roles distribution
    role_dist = db.session.execute(
        text("""
        SELECT r.role_name, COUNT(u.user_id) AS user_count
        FROM roles r
        LEFT JOIN users u ON u.role_id = r.role_id AND u.deleted_at IS NULL
        GROUP BY r.role_id, r.role_name
        ORDER BY user_count DESC
    """)
    ).fetchall()

    user_roles_chart = [
        {"name": row.role_name.replace("_", " ").title(), "value": row.user_count}
        for row in role_dist
    ]

    # Audit activity by day (last 7 days)
    audit_activity = db.session.execute(
        text("""
        SELECT DATE(created_at) AS day, action, COUNT(*) AS count
        FROM audit_log
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at), action
        ORDER BY day
    """)
    ).fetchall()

    daily_audit = {}
    for row in audit_activity:
        day_str = str(row.day)
        if day_str not in daily_audit:
            daily_audit[day_str] = {
                "date": day_str,
                "creates": 0,
                "updates": 0,
                "deletes": 0,
            }
        action = row.action.lower() if row.action else ""
        if "create" in action or "insert" in action:
            daily_audit[day_str]["creates"] += row.count
        elif "update" in action or "adjust" in action:
            daily_audit[day_str]["updates"] += row.count
        elif "delete" in action or "void" in action:
            daily_audit[day_str]["deletes"] += row.count

    audit_activity_chart = sorted(daily_audit.values(), key=lambda x: x["date"])

    # Table size breakdown
    table_sizes = db.session.execute(
        text("""
        SELECT table_name,
               ROUND(data_length / 1024 / 1024, 2) AS data_mb,
               ROUND(index_length / 1024 / 1024, 2) AS index_mb,
               table_rows
        FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'
        ORDER BY data_length DESC
        LIMIT 10
    """)
    ).fetchall()

    table_size_chart = [
        {
            "table": row.table_name.replace("_", " ").title(),
            "data_mb": float(row.data_mb) if row.data_mb else 0,
            "index_mb": float(row.index_mb) if row.index_mb else 0,
            "rows": row.table_rows,
        }
        for row in table_sizes
    ]

    return jsonify(
        stats=stats,
        system_health={
            "database_size_mb": float(db_size) if db_size else 0,
            "total_users": total_users,
            "active_users": active_users,
            "recent_logins_7d": recent_logins,
            "errors_24h": error_count,
            "kra_pending": kra_pending,
            "stock_alerts": stock_alerts,
            "pending_pos": pending_pos,
            "active_deliveries": active_deliveries,
        },
        user_roles_distribution=user_roles_chart,
        audit_activity=audit_activity_chart,
        table_sizes=table_size_chart,
    )
