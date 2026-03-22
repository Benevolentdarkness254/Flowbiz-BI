# backend/app/jobs/bi_aggregator.py
from datetime import date, timedelta
from sqlalchemy import text
from app.extensions import db
from app.models.bi import FactDailySales, FactDailyInventory


def aggregate_daily_sales(app):
    """
    Aggregate yesterday's sales into fact_daily_sales.
    Runs at 00:05 daily so yesterday's data is always complete.
    Uses INSERT ... ON DUPLICATE KEY UPDATE so it is safe to re-run.
    """
    with app.app_context():
        yesterday    = date.today() - timedelta(days=1)
        yesterday_id = int(yesterday.strftime('%Y%m%d'))

        app.logger.info(f'Aggregating sales for {yesterday}...')

        # Check dim_date exists for yesterday
        from app.models.bi import DimDate
        if not DimDate.query.get(yesterday_id):
            app.logger.warning(f'dim_date missing for {yesterday} — skipping aggregation')
            return

        db.session.execute(text("""
            INSERT INTO fact_daily_sales
                (date_id, product_id, customer_type, payment_method,
                 units_sold, gross_revenue, discount_total, tax_total,
                 net_revenue, transaction_count)
            SELECT
                :date_id,
                si.product_id,
                c.customer_type,
                st.payment_method,
                SUM(si.quantity)                                    AS units_sold,
                SUM(si.quantity * si.unit_price)                    AS gross_revenue,
                SUM(si.discount)                                    AS discount_total,
                SUM(st.tax_amount / NULLIF(
                    (SELECT COUNT(*) FROM sale_items s2
                     WHERE s2.transaction_id = st.transaction_id), 0))  AS tax_total,
                SUM(si.subtotal)                                    AS net_revenue,
                COUNT(DISTINCT st.transaction_id)                   AS transaction_count
            FROM sale_items si
            JOIN sale_transactions st ON st.transaction_id = si.transaction_id
            JOIN customers c          ON c.customer_id     = st.customer_id
            WHERE DATE(st.transaction_date) = :target_date
              AND st.payment_status != 'cancelled'
            GROUP BY si.product_id, c.customer_type, st.payment_method
            ON DUPLICATE KEY UPDATE
                units_sold        = VALUES(units_sold),
                gross_revenue     = VALUES(gross_revenue),
                discount_total    = VALUES(discount_total),
                tax_total         = VALUES(tax_total),
                net_revenue       = VALUES(net_revenue),
                transaction_count = VALUES(transaction_count)
        """), {'date_id': yesterday_id, 'target_date': yesterday})

        db.session.commit()
        app.logger.info(f'Sales aggregation complete for {yesterday}')