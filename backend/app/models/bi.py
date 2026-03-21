# backend/app/models/bi.py
from app.extensions import db
""" NOTE
BI means Business Intellegence
"""

class DimDate(db.Model):
    """
    Pre-populated date dimension table.
    Every row represents one calendar day with pre-computed attributes.
    BI queries join against this instead of using MySQL date functions,
    which is faster and enables 'is_public_holiday' filtering.
    """
    __tablename__ = 'dim_date'

    date_id           = db.Column(db.Integer, primary_key=True)  # YYYYMMDD format
    full_date         = db.Column(db.Date,    nullable=False, unique=True)
    day_of_week       = db.Column(db.SmallInteger, nullable=False)
    day_name          = db.Column(db.String(10),   nullable=False)
    week_of_year      = db.Column(db.SmallInteger, nullable=False)
    month_num         = db.Column(db.SmallInteger, nullable=False)
    month_name        = db.Column(db.String(10),   nullable=False)
    quarter           = db.Column(db.SmallInteger, nullable=False)
    year              = db.Column(db.SmallInteger, nullable=False)
    is_weekend        = db.Column(db.Boolean, nullable=False)
    is_public_holiday = db.Column(db.Boolean, default=False)
    holiday_name      = db.Column(db.String(50))


class FactDailySales(db.Model):
    """
    Materialised daily summary of sales.
    Updated nightly by bi_aggregator.py.
    The BI dashboard uses this model instead of summing raw sale_transactions,
    which would be slow on large datasets.
    """
    __tablename__ = 'fact_daily_sales'

    fact_id           = db.Column(db.BigInteger, primary_key=True)
    date_id           = db.Column(db.Integer, db.ForeignKey('dim_date.date_id'), nullable=False)
    product_id        = db.Column(db.Integer, db.ForeignKey('products.product_id'), nullable=False)
    customer_type     = db.Column(db.String(20), nullable=False)
    payment_method    = db.Column(db.String(20), nullable=False)
    units_sold        = db.Column(db.Integer,           default=0)
    gross_revenue     = db.Column(db.Numeric(14, 2),    default=0)
    discount_total    = db.Column(db.Numeric(14, 2),    default=0)
    tax_total         = db.Column(db.Numeric(14, 2),    default=0)
    net_revenue       = db.Column(db.Numeric(14, 2),    default=0)
    transaction_count = db.Column(db.Integer,           default=0)

    date    = db.relationship('DimDate')
    product = db.relationship('Product')


class FactDailyInventory(db.Model):
    """Materialised daily inventory snapshot per product."""
    __tablename__ = 'fact_daily_inventory'

    fact_id        = db.Column(db.BigInteger, primary_key=True)
    date_id        = db.Column(db.Integer, db.ForeignKey('dim_date.date_id'), nullable=False)
    product_id     = db.Column(db.Integer, db.ForeignKey('products.product_id'), nullable=False)
    opening_stock  = db.Column(db.Integer, nullable=False)
    units_received = db.Column(db.Integer, default=0)
    units_sold     = db.Column(db.Integer, default=0)
    units_adjusted = db.Column(db.Integer, default=0)
    closing_stock  = db.Column(db.Integer, nullable=False)
    stockout_flag  = db.Column(db.Boolean, default=False)

    date    = db.relationship('DimDate')
    product = db.relationship('Product')
