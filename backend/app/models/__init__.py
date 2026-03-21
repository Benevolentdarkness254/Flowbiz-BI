# backend/app/models/__init__.py
# Import all model modules here.
# Flask-Migrate (Alembic) discovers tables by scanning imported metadata.
# If a model module is never imported, its tables are invisible to migrations.

from . import auth
from . import inventory
from . import sales
from . import receipts
from . import bi
from . import purchase_orders
