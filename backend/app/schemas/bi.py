# backend/app/schemas/bi.py
from marshmallow import fields, validate
from flask_marshmallow import Marshmallow

ma = Marshmallow()


class DateRangeSchema(ma.Schema):
    """Validates query parameters for any date-range BI endpoint."""
    start_date = fields.Date(required=True)
    end_date   = fields.Date(required=True)

    def validate_range(self, data, **kwargs):
        if data['start_date'] > data['end_date']:
            raise ValidationError('start_date must be before end_date')
        return data


class DashboardStatsSchema(ma.Schema):
    """Serializes the dashboard summary response."""
    today_revenue      = fields.Float()
    today_transactions = fields.Int()
    low_stock_count    = fields.Int()
    pending_pos        = fields.Int()