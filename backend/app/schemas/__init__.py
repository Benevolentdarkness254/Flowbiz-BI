# backend/app/schemas/__init__.py
# Import all schemas here so they can be imported cleanly from anywhere.
# Example: from app.schemas import SaleTransactionSchema

from .auth      import LoginSchema, UserSchema, CreateUserSchema
from .sales     import (CreateSaleSchema, SaleTransactionSchema,
                        SaleItemInputSchema, CustomerSchema)
from .inventory import (ProductSchema, CreateProductSchema,
                        StockAdjustSchema, SupplierSchema)
from .receipts  import ReceiptSchema, DispatchReceiptSchema
from .bi        import DateRangeSchema, DashboardStatsSchema