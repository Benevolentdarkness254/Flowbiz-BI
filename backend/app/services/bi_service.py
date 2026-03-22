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
        {'start': start_date, 'end': end_date}
    )
    return [dict(row._mapping) for row in result]


def get_inventory_status() -> list[dict]:
   
    result = db.session.execute(text("""
        SELECT product_id, sku, name, category, unit_of_measure,
               current_stock, min_stock_level, reorder_qty,
               price, stock_value, stock_status
        FROM   vw_inventory_status
        ORDER  BY stock_status, name
    """))
    return [dict(row._mapping) for row in result]


def get_customer_summary() -> list[dict]:
    
    result = db.session.execute(text("""
        SELECT customer_id, customer_name, customer_type, zone,
               total_transactions, lifetime_value,
               last_purchase_date, avg_basket_size
        FROM   vw_customer_sales_summary
        ORDER  BY lifetime_value DESC
        LIMIT  100
    """))
    return [dict(row._mapping) for row in result]


def get_kra_queue() -> list[dict]:
    
    result = db.session.execute(text("""
        SELECT invoice_id, invoice_number, invoice_type, invoice_date,
               total_amount, tax_amount, kra_status, kra_error_log,
               customer_name, customer_kra_pin, payment_method, mpesa_ref
        FROM   vw_kra_submission_queue
        ORDER  BY invoice_date ASC
    """))
    return [dict(row._mapping) for row in result]


def get_dashboard_stats() -> dict:
    
    today = date.today()
    today_id = int(today.strftime('%Y%m%d'))

    fact_row = db.session.execute(
        text("""
            SELECT SUM(net_revenue)       AS revenue,
                   SUM(units_sold)        AS units,
                   SUM(transaction_count) AS transactions
            FROM   fact_daily_sales
            WHERE  date_id = :date_id
        """),
        {'date_id': today_id}
    ).first()

    
    if fact_row and fact_row.transactions:
        revenue      = float(fact_row.revenue or 0)
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
            {'today': today}
        ).first()
        revenue      = float(live.revenue)
        transactions = int(live.transactions)

    
    low_stock = db.session.execute(
        text("SELECT COUNT(*) FROM vw_inventory_status WHERE stock_status != 'ok'")
    ).scalar()

    pending_pos = db.session.execute(
        text("SELECT COUNT(*) FROM purchase_orders WHERE status = 'pending_approval'")
    ).scalar()

    return {
        'today_revenue':      revenue,
        'today_transactions': transactions,
        'low_stock_count':    int(low_stock),
        'pending_pos':        int(pending_pos),
    }