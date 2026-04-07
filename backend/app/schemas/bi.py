# backend/app/schemas/bi.py
from marshmallow import fields, validate
from flask_marshmallow import Marshmallow

ma = Marshmallow()


class DateRangeSchema(ma.Schema):
    """Validates query parameters for any date-range BI endpoint."""

    start_date = fields.Date(required=False)
    end_date = fields.Date(required=False)

    class Meta:
        unknown = "exclude"


class DashboardStatsSchema(ma.Schema):
    """Serializes the dashboard summary response."""

    today_revenue = fields.Float()
    today_transactions = fields.Int()
    low_stock_count = fields.Int()
    pending_pos = fields.Int()
