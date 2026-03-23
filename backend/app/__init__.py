from flask import Flask
import flask
from .extensions import db, migrate, jwt, cors
def create_app(config: str = 'config.settings.Config') -> Flask:
    app = Flask(__name__)
    app.config.from_object(config)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={
        r'/api/*' : {
         'origins' : ['http://localhost:5173'],
         'supports_credentials' : True,
         'methods' : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
         'allow_headers' : ['Content-Type', 'authorization'],
        }
    })
    from .models import(
        auth, sales, inventory, receipts, bi, purchase_orders
    )

    from .api.auth import auth_bp
    from .api.sales import sales_bp
    from .api.inventory import inventory_bp
    from .api.receipts import receipts_bp
    from .api.bi import bi_bp
    from .api.purchase_orders import po_bp

    app.register_blueprint(auth_bp,      url_prefix='/api/auth')
    app.register_blueprint(sales_bp,     url_prefix='/api/sales')
    app.register_blueprint(inventory_bp, url_prefix='/api/inventory')
    app.register_blueprint(bi_bp,        url_prefix='/api/bi')
    app.register_blueprint(receipts_bp,  url_prefix='/api/receipts')
    app.register_blueprint(po_bp,        url_prefix='/api/purchase-orders')

    if not app.testing:
        from .jobs import init_scheduler
        init_scheduler(app)

    return app
