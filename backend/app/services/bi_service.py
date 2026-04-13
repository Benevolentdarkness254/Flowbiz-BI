from datetime import date, timedelta
from sqlalchemy import text
from app.extensions import db


def get_revenue_summary(start_date: date, end_date: date) -> list[dict]:
    result = db.session.execute(
        text("""
            SELECT full_date, product_category, product_name,
                   total_units, gross_revenue, total_discounts,
                   total_vat, net_revenue, transactions
            FROM   vw_revenue_summary
            WHERE  full_date BETWEEN :start AND :end
            ORDER  BY full_date DESC
        """),
        {"start": start_date, "end": end_date},
    )
    rows = [dict(row._mapping) for row in result]
    if rows:
        return rows
    return _get_live_revenue(start_date, end_date)


def _get_live_revenue(start_date: date, end_date: date) -> list[dict]:
    result = db.session.execute(
        text("""
            SELECT
                DATE(st.transaction_date) AS full_date,
                p.category                AS product_category,
                p.name                    AS product_name,
                SUM(si.quantity)          AS total_units,
                SUM(si.quantity * si.unit_price)                        AS gross_revenue,
                SUM(si.discount)                                        AS total_discounts,
                ROUND(SUM((si.quantity * si.unit_price - si.discount) * 0.16), 2) AS total_vat,
                SUM(si.quantity * si.unit_price - si.discount)          AS net_revenue,
                COUNT(DISTINCT st.transaction_id)                       AS transactions
            FROM sale_transactions st
            JOIN sale_items si ON si.transaction_id = st.transaction_id
            JOIN products p    ON p.product_id = si.product_id
            WHERE DATE(st.transaction_date) BETWEEN :start AND :end
              AND st.payment_status != 'cancelled'
            GROUP BY DATE(st.transaction_date), p.category, p.name
            ORDER BY full_date DESC
        """),
        {"start": start_date, "end": end_date},
    )
    return [dict(row._mapping) for row in result]


def get_inventory_status() -> list[dict]:

    result = db.session.execute(
        text("""
        SELECT product_id, sku, name, category, unit_of_measure,
               current_stock, min_stock_level, reorder_qty,
               price, stock_value, stock_status
        FROM   vw_inventory_status
        ORDER  BY stock_status, name
    """)
    )
    return [dict(row._mapping) for row in result]


def get_customer_summary() -> list[dict]:
    result = db.session.execute(
        text("""
        SELECT customer_id, customer_name, customer_type, zone,
               total_transactions, lifetime_value,
               last_purchase_date, avg_basket_size
        FROM   vw_customer_sales_summary
        ORDER  BY lifetime_value DESC
        LIMIT  100
    """)
    )
    return [dict(row._mapping) for row in result]


def get_kra_queue() -> list[dict]:

    result = db.session.execute(
        text("""
        SELECT invoice_id, invoice_number, invoice_type, invoice_date,
               total_amount, tax_amount, kra_status, kra_error_log,
               customer_name, customer_kra_pin, payment_method, mpesa_ref
        FROM   vw_kra_submission_queue
        ORDER  BY invoice_date ASC
    """)
    )
    return [dict(row._mapping) for row in result]


def get_dashboard_stats() -> dict:

    today = date.today()
    today_id = int(today.strftime("%Y%m%d"))

    fact_row = db.session.execute(
        text("""
            SELECT SUM(net_revenue)       AS revenue,
                   SUM(units_sold)        AS units,
                   SUM(transaction_count) AS transactions
            FROM   fact_daily_sales
            WHERE  date_id = :date_id
        """),
        {"date_id": today_id},
    ).first()

    if fact_row and fact_row.transactions:
        revenue = float(fact_row.revenue or 0)
        transactions = int(fact_row.transactions or 0)
    else:
        live = db.session.execute(
            text("""
                SELECT COALESCE(SUM(total_amount), 0) AS revenue,
                       COUNT(*)                        AS transactions
                FROM   sale_transactions
                WHERE  DATE(transaction_date) = :today
                  AND  payment_status != 'cancelled'
            """),
            {"today": today},
        ).first()
        revenue = float(live.revenue)
        transactions = int(live.transactions)

    low_stock = db.session.execute(
        text("SELECT COUNT(*) FROM vw_inventory_status WHERE stock_status != 'ok'")
    ).scalar()

    pending_pos = db.session.execute(
        text("SELECT COUNT(*) FROM purchase_orders WHERE status = 'pending_approval'")
    ).scalar()

    return {
        "today_revenue": revenue,
        "today_transactions": transactions,
        "low_stock_count": int(low_stock),
        "pending_pos": int(pending_pos),
    }


def get_business_overview(start_date: date, end_date: date) -> dict:
    """Bird's-eye view: KPIs across all business domains."""
    # Sales KPIs
    sales = db.session.execute(
        text("""
            SELECT
                COUNT(*) AS total_transactions,
                COALESCE(SUM(total_amount), 0) AS total_revenue,
                COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) AS collected,
                COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN total_amount ELSE 0 END), 0) AS pending,
                COALESCE(SUM(CASE WHEN payment_status = 'partial' THEN total_amount ELSE 0 END), 0) AS partial,
                COALESCE(SUM(discount_amount), 0) AS total_discounts,
                COALESCE(SUM(tax_amount), 0) AS total_tax
            FROM sale_transactions
            WHERE DATE(transaction_date) BETWEEN :start AND :end
              AND payment_status != 'cancelled'
        """),
        {"start": start_date, "end": end_date},
    ).first()

    # Payment method breakdown
    payment_methods = db.session.execute(
        text("""
            SELECT payment_method,
                   COUNT(*) AS count,
                   COALESCE(SUM(total_amount), 0) AS total
            FROM sale_transactions
            WHERE DATE(transaction_date) BETWEEN :start AND :end
              AND payment_status != 'cancelled'
            GROUP BY payment_method
        """),
        {"start": start_date, "end": end_date},
    ).fetchall()

    # Top products by revenue
    top_products = db.session.execute(
        text("""
            SELECT p.name, p.category,
                   SUM(si.quantity) AS units_sold,
                   SUM(si.quantity * si.unit_price - si.discount) AS revenue
            FROM sale_items si
            JOIN sale_transactions st ON st.transaction_id = si.transaction_id
            JOIN products p ON p.product_id = si.product_id
            WHERE DATE(st.transaction_date) BETWEEN :start AND :end
              AND st.payment_status != 'cancelled'
            GROUP BY p.name, p.category
            ORDER BY revenue DESC
            LIMIT 10
        """),
        {"start": start_date, "end": end_date},
    ).fetchall()

    # Top customers by revenue
    top_customers = db.session.execute(
        text("""
            SELECT c.name AS customer_name, c.customer_type, c.zone,
                   COUNT(DISTINCT st.transaction_id) AS transactions,
                   COALESCE(SUM(st.total_amount), 0) AS total_spent
            FROM sale_transactions st
            JOIN customers c ON c.customer_id = st.customer_id
            WHERE DATE(st.transaction_date) BETWEEN :start AND :end
              AND st.payment_status != 'cancelled'
            GROUP BY c.name, c.customer_type, c.zone
            ORDER BY total_spent DESC
            LIMIT 10
        """),
        {"start": start_date, "end": end_date},
    ).fetchall()

    # Inventory value
    inv_value = db.session.execute(
        text(
            "SELECT COALESCE(SUM(current_stock * price), 0) FROM products WHERE deleted_at IS NULL"
        )
    ).scalar()

    low_stock = db.session.execute(
        text(
            "SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND current_stock <= min_stock_level AND current_stock > 0"
        )
    ).scalar()

    out_of_stock = db.session.execute(
        text(
            "SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND current_stock = 0"
        )
    ).scalar()

    # Delivery stats
    deliveries = db.session.execute(
        text("""
            SELECT status, COUNT(*) AS count
            FROM outbound_deliveries
            GROUP BY status
        """)
    ).fetchall()

    # PO stats
    pos = db.session.execute(
        text("""
            SELECT status, COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS total_value
            FROM purchase_orders
            GROUP BY status
        """)
    ).fetchall()

    # User activity
    users = db.session.execute(
        text("SELECT COUNT(*) FROM users WHERE is_active = 1 AND deleted_at IS NULL")
    ).scalar()

    # Receipt stats
    receipts_stats = db.session.execute(
        text("""
            SELECT receipt_type, COUNT(*) AS count, COALESCE(SUM(amount_paid), 0) AS total
            FROM receipts
            WHERE voided_at IS NULL
            GROUP BY receipt_type
        """)
    ).fetchall()

    return {
        "sales": {
            "total_transactions": sales.total_transactions,
            "total_revenue": float(sales.total_revenue),
            "collected": float(sales.collected),
            "pending": float(sales.pending),
            "partial": float(sales.partial),
            "total_discounts": float(sales.total_discounts),
            "total_tax": float(sales.total_tax),
            "payment_methods": [
                {"method": r.payment_method, "count": r.count, "total": float(r.total)}
                for r in payment_methods
            ],
            "top_products": [
                {
                    "name": r.name,
                    "category": r.category,
                    "units_sold": r.units_sold,
                    "revenue": float(r.revenue),
                }
                for r in top_products
            ],
            "top_customers": [
                {
                    "customer_name": r.customer_name,
                    "customer_type": r.customer_type,
                    "zone": r.zone,
                    "transactions": r.transactions,
                    "total_spent": float(r.total_spent),
                }
                for r in top_customers
            ],
        },
        "inventory": {
            "total_value": float(inv_value),
            "low_stock": int(low_stock),
            "out_of_stock": int(out_of_stock),
        },
        "deliveries": {r.status: r.count for r in deliveries},
        "purchase_orders": {
            r.status: {"count": r.count, "total_value": float(r.total_value)}
            for r in pos
        },
        "users": int(users),
        "receipts": {
            r.receipt_type: {"count": r.count, "total": float(r.total)}
            for r in receipts_stats
        },
    }


def get_delivery_analytics() -> dict:
    """Delivery status summary and driver performance."""
    # Status breakdown
    status_breakdown = db.session.execute(
        text("""
            SELECT status, COUNT(*) AS count
            FROM outbound_deliveries
            GROUP BY status
        """)
    ).fetchall()

    # Driver performance
    driver_perf = db.session.execute(
        text("""
            SELECT u.full_name AS driver_name,
                   COUNT(*) AS total_deliveries,
                   SUM(CASE WHEN od.status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
                   SUM(CASE WHEN od.status IN ('in_transit', 'scheduled') THEN 1 ELSE 0 END) AS pending,
                   SUM(CASE WHEN od.status = 'failed' THEN 1 ELSE 0 END) AS failed
            FROM outbound_deliveries od
            JOIN users u ON u.user_id = od.driver_id
            GROUP BY u.full_name
            ORDER BY delivered DESC
        """)
    ).fetchall()

    # Zone breakdown
    zone_stats = db.session.execute(
        text("""
            SELECT delivery_zone,
                   COUNT(*) AS total,
                   SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered
            FROM outbound_deliveries
            WHERE delivery_zone IS NOT NULL
            GROUP BY delivery_zone
            ORDER BY total DESC
        """)
    ).fetchall()

    # Recent delivery log
    recent = db.session.execute(
        text("""
            SELECT od.delivery_id, c.name AS customer_name, u.full_name AS driver_name,
                   od.delivery_zone, od.status, od.scheduled_date, od.delivered_at,
                   od.delivery_notes
            FROM outbound_deliveries od
            JOIN customers c ON c.customer_id = od.customer_id
            JOIN users u ON u.user_id = od.driver_id
            ORDER BY od.scheduled_date DESC
            LIMIT 20
        """)
    ).fetchall()

    # Inbound delivery stats
    inbound = db.session.execute(
        text("""
            SELECT id.status, COUNT(*) AS count, s.name AS supplier_name
            FROM inbound_deliveries id
            JOIN suppliers s ON s.supplier_id = id.supplier_id
            GROUP BY id.status, s.name
            ORDER BY count DESC
        """)
    ).fetchall()

    return {
        "outbound_status": {r.status: r.count for r in status_breakdown},
        "driver_performance": [
            {
                "driver_name": r.driver_name,
                "total_deliveries": r.total_deliveries,
                "delivered": r.delivered,
                "pending": r.pending,
                "failed": r.failed,
            }
            for r in driver_perf
        ],
        "zone_stats": [
            {
                "delivery_zone": r.delivery_zone,
                "total": r.total,
                "delivered": r.delivered,
            }
            for r in zone_stats
        ],
        "recent_deliveries": [
            {
                "delivery_id": r.delivery_id,
                "customer_name": r.customer_name,
                "driver_name": r.driver_name,
                "delivery_zone": r.delivery_zone,
                "status": r.status,
                "scheduled_date": r.scheduled_date.isoformat()
                if r.scheduled_date
                else None,
                "delivered_at": r.delivered_at.isoformat() if r.delivered_at else None,
                "delivery_notes": r.delivery_notes,
            }
            for r in recent
        ],
        "inbound_summary": [
            {"status": r.status, "count": r.count, "supplier_name": r.supplier_name}
            for r in inbound
        ],
    }


def get_po_analytics() -> dict:
    """Purchase order pipeline and supplier performance."""
    # Pipeline summary
    pipeline = db.session.execute(
        text("""
            SELECT status, COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS total_value
            FROM purchase_orders
            GROUP BY status
        """)
    ).fetchall()

    # Supplier performance
    supplier_perf = db.session.execute(
        text("""
            SELECT s.name AS supplier_name,
                   COUNT(*) AS total_orders,
                   COALESCE(SUM(po.total_amount), 0) AS total_value,
                   SUM(CASE WHEN po.status = 'received' THEN 1 ELSE 0 END) AS received,
                   SUM(CASE WHEN po.status = 'approved' THEN 1 ELSE 0 END) AS approved,
                   SUM(CASE WHEN po.status = 'declined' THEN 1 ELSE 0 END) AS declined
            FROM purchase_orders po
            JOIN suppliers s ON s.supplier_id = po.supplier_id
            GROUP BY s.name
            ORDER BY total_value DESC
        """)
    ).fetchall()

    # Recent POs
    recent = db.session.execute(
        text("""
            SELECT po.purchase_order_id, po.order_date, po.expected_delivery,
                   po.total_amount, po.status, po.rejection_reason,
                   s.name AS supplier_name, u.full_name AS requested_by
            FROM purchase_orders po
            JOIN suppliers s ON s.supplier_id = po.supplier_id
            JOIN users u ON u.user_id = po.requested_by
            ORDER BY po.order_date DESC
            LIMIT 20
        """)
    ).fetchall()

    return {
        "pipeline": {
            r.status: {"count": r.count, "total_value": float(r.total_value)}
            for r in pipeline
        },
        "supplier_performance": [
            {
                "supplier_name": r.supplier_name,
                "total_orders": r.total_orders,
                "total_value": float(r.total_value),
                "received": r.received,
                "approved": r.approved,
                "declined": r.declined,
            }
            for r in supplier_perf
        ],
        "recent_orders": [
            {
                "purchase_order_id": r.purchase_order_id,
                "order_date": r.order_date.isoformat() if r.order_date else None,
                "expected_delivery": r.expected_delivery.isoformat()
                if r.expected_delivery
                else None,
                "total_amount": float(r.total_amount),
                "status": r.status,
                "rejection_reason": r.rejection_reason,
                "supplier_name": r.supplier_name,
                "requested_by": r.requested_by,
            }
            for r in recent
        ],
    }


def get_hr_analytics() -> dict:
    """User activity and team overview."""
    # User count by role
    role_counts = db.session.execute(
        text("""
            SELECT r.role_name, COUNT(*) AS count
            FROM users u
            JOIN roles r ON r.role_id = u.role_id
            WHERE u.is_active = 1 AND u.deleted_at IS NULL
            GROUP BY r.role_name
        """)
    ).fetchall()

    # Sales staff performance (only roles with sale.create permission)
    staff_perf = db.session.execute(
        text("""
            SELECT u.full_name, u.username,
                   COUNT(DISTINCT st.transaction_id) AS total_sales,
                   COALESCE(SUM(st.total_amount), 0) AS total_revenue,
                   COUNT(DISTINCT DATE(st.transaction_date)) AS active_days
            FROM users u
            LEFT JOIN sale_transactions st ON st.sales_staff_id = u.user_id
              AND st.payment_status != 'cancelled'
              AND DATE(st.transaction_date) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            WHERE u.role_id IN (SELECT role_id FROM roles WHERE role_name IN ('sales_staff', 'business_owner'))
              AND u.is_active = 1
            GROUP BY u.full_name, u.username
            ORDER BY total_revenue DESC
        """)
    ).fetchall()

    # Recent user logins
    recent_logins = db.session.execute(
        text("""
            SELECT u.full_name, u.username, r.role_name, u.last_login_at, u.is_active
            FROM users u
            JOIN roles r ON r.role_id = u.role_id
            ORDER BY u.last_login_at IS NULL, u.last_login_at DESC
            LIMIT 20
        """)
    ).fetchall()

    return {
        "role_distribution": [
            {"role_name": r.role_name, "count": r.count} for r in role_counts
        ],
        "staff_performance": [
            {
                "full_name": r.full_name,
                "username": r.username,
                "total_sales": r.total_sales,
                "total_revenue": float(r.total_revenue),
                "active_days": r.active_days,
            }
            for r in staff_perf
        ],
        "recent_logins": [
            {
                "full_name": r.full_name,
                "username": r.username,
                "role_name": r.role_name,
                "last_login_at": r.last_login_at.isoformat()
                if r.last_login_at
                else None,
                "is_active": bool(r.is_active),
            }
            for r in recent_logins
        ],
    }
