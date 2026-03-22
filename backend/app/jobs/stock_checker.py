# backend/app/jobs/stock_checker.py
from app.extensions import db
from app.models.inventory import Product
from app.services.inventory_service import _check_and_create_alert


def check_stock_levels(app):
    """
    Scan all active products and create stock alerts for any that are
    at or below their minimum stock level. Runs every 30 minutes.
    The _check_and_create_alert function is idempotent — it only creates
    an alert if there isn't already an unresolved one.
    """
    with app.app_context():
        products = Product.query.filter_by(is_active=True, deleted_at=None).all()
        alerts_created = 0

        for product in products:
            if product.is_low_stock():
                _check_and_create_alert(product)
                alerts_created += 1

        if alerts_created:
            db.session.commit()
            app.logger.info(f'Stock check: {alerts_created} alert(s) created/updated')