# FlowBiz BI — Codebase Analysis & Context

## Overview

**FlowBiz BI** (also referred to as **AQUA Business Management System**) is a full-stack business intelligence and management application built for a **water packing and refilling business** in Kenya. It provides end-to-end management of sales, inventory, purchasing, deliveries, customer relationships, financial reporting, and regulatory compliance (KRA eTIMS integration).

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Flask 3.0.3** | Python web framework |
| **Flask-SQLAlchemy 3.1.1** | ORM for database interactions |
| **Flask-Migrate 4.0.7** | Database migrations (Alembic) |
| **Flask-JWT-Extended 4.6.0** | JWT authentication via HTTP-only cookies |
| **Flask-CORS 4.0.1** | Cross-origin requests from React frontend |
| **Marshmallow** | Serialization and validation |
| **PyMySQL + Cryptography** | MySQL 8.0 driver with SHA2 auth support |
| **APScheduler 3.10.4** | Background job scheduling |
| **Requests** | HTTP client for external APIs (KRA, M-Pesa, SMS) |
| **Pytest + Factory Boy** | Testing framework |

### Frontend
| Technology | Purpose |
|---|---|
| **React 19.2.4** | UI library |
| **Vite 8.0.1** | Build tool and dev server |
| **React Router DOM 7.13.2** | Client-side routing |
| **Bootstrap 5.3.8 + React-Bootstrap** | UI component library |
| **Recharts 3.8.0** | Data visualization / charts |
| **Axios 1.13.6** | HTTP client for API calls |
| **Vitest + Testing Library** | Testing framework |

### Database
| Technology | Purpose |
|---|---|
| **MySQL 8.0** | Primary relational database |

---

## Architecture

### Pattern: Client-Server with API Blueprint Architecture

```
┌──────────────────┐         ┌──────────────────┐
│   React Frontend │  HTTP   │   Flask Backend  │
│   (Port 5173)    │◄───────►│   (Port 5000)    │
│                  │  CORS   │                  │
│  - Components    │         │  - Blueprints    │
│  - Context API   │         │  - Services      │
│  - Hooks         │         │  - Models        │
│  - Recharts      │         │  - Jobs/Scheduler│
└──────────────────┘         └────────┬─────────┘
                                      │
                               ┌──────▼───────┐
                               │   MySQL 8.0  │
                               │   Database   │
                               └──────────────┘
```

### Backend Structure (`backend/app/`)

```
app/
├── __init__.py          # Flask app factory
├── extensions.py        # DB, Migrate, JWT, CORS instances
├── cli.py               # CLI commands
├── api/                 # API route blueprints
│   ├── auth.py          # /api/auth — login, logout, register, me
│   ├── sales.py         # /api/sales — transactions, items, customers
│   ├── inventory.py     # /api/inventory — products, stock, alerts
│   ├── bi.py            # /api/bi — business intelligence endpoints
│   ├── receipts.py      # /api/receipts — receipt generation/dispatch
│   ├── purchase_orders.py # /api/purchase-orders — PO lifecycle
│   ├── system.py        # System-level endpoints
│   └── decorators.py    # @require_permission() RBAC decorator
├── models/              # SQLAlchemy ORM models
│   ├── auth.py          # User, Role, Permission models
│   ├── sales.py         # SaleTransaction, SaleItem, Invoice models
│   ├── inventory.py     # Product, StockAlert, InventoryMovement models
│   ├── bi.py            # DimDate, FactDailySales, FactDailyInventory
│   ├── purchase_orders.py # PurchaseOrder, POItem models
│   ├── receipts.py      # Receipt, ReceiptPrintLog models
│   └── enums.py         # Python enum definitions
├── services/            # Business logic layer
│   ├── auth_service.py  # Authentication logic
│   ├── sales_service.py # Sale processing
│   ├── inventory_service.py # Stock management
│   ├── bi_service.py    # BI data aggregation
│   ├── kra_service.py   # KRA eTIMS submission
│   ├── sms_service.py   # SMS/WhatsApp receipt dispatch
│   └── receipt_service.py # Receipt generation
└── jobs/                # Scheduled background tasks
    ├── __init__.py      # Scheduler initialization
    ├── bi_aggregator.py # Daily sales aggregation (00:05)
    ├── kra_submitter.py # KRA invoice submission retry
    ├── stock_checker.py # Stock level monitoring (every 30 min)
    └── dim_date_seeder.py # Date dimension table seeding
```

### Frontend Structure (`frontend/src/`)

```
src/
├── main.jsx             # React entry point
├── App.jsx              # Router and route definitions
├── nav.config.js        # Navigation configuration
├── context/
│   └── AuthContext.jsx  # Global auth state + user permissions
├── hooks/
│   ├── useApi.js        # API request hook
│   └── usePermission.js # Permission checking (can, canAny, canAll)
├── pages/
│   ├── Login.jsx        # Authentication page
│   ├── Dashboard.jsx    # Main dashboard overview
│   ├── Sales.jsx        # Sales management
│   ├── Customers.jsx    # Customer management
│   ├── Inventory.jsx    # Stock/inventory management
│   └── Reports.jsx      # Financial/BI reports with charts
├── components/
│   └── common/
│       ├── AppShell.jsx       # Layout wrapper with sidebar/nav
│       └── ProtectedRoute.jsx # Route guard with permission checks
└── api/                 # API client modules
```

---

## Database Schema

The database (`database/schema_v2.sql`) is comprehensive with **20+ tables** organized into these domains:

### RBAC (Role-Based Access Control)
- **permissions** — Permission keys and modules
- **roles** — User roles (system_admin, business_owner, sales_staff, inventory_staff, driver)
- **role_permissions** — Many-to-many junction
- **users** — User accounts with role assignment

### Sales & Customers
- **customers** — Walk-in, account, and wholesale customers with credit tracking
- **sale_transactions** — Sale headers with payment method/status
- **sale_items** — Line items with container return tracking

### Invoicing & KRA eTIMS
- **invoices** — Tax invoices with KRA submission status tracking

### Inventory & Products
- **products** — Product catalog with stock levels and reorder points
- **product_suppliers** — Supplier-product relationships
- **inventory_movements** — Stock movement ledger (audit trail)
- **stock_alerts** — Low stock/out of stock alerts

### Suppliers & Purchasing
- **suppliers** + **supplier_contacts** — Supplier management
- **purchase_orders** + **purchase_order_items** — PO lifecycle with approval workflow

### Deliveries
- **outbound_deliveries** — Customer deliveries with driver assignment, zone tracking, signature capture
- **inbound_deliveries** + **inbound_delivery_items** — Supplier deliveries

### Business Intelligence (Star Schema)
- **dim_date** — Date dimension table
- **fact_daily_sales** — Daily aggregated sales facts
- **fact_daily_inventory** — Daily inventory snapshots

### BI Views
- **vw_revenue_summary** — Revenue by date, product, category
- **vw_inventory_status** — Current stock status and valuation
- **vw_customer_sales_summary** — Customer lifetime value metrics
- **vw_po_pipeline** — Purchase order pipeline view
- **vw_kra_submission_queue** — Pending KRA submissions

### Other
- **audit_log** — System-wide audit trail
- **financial_report_runs** — Report generation log
- **receipts** — Receipt records with dispatch tracking

---

## Key Features

### 1. Authentication & Authorization
- JWT-based auth with HTTP-only cookies (secure, CSRF-protected)
- Role-based access control (RBAC) with granular permissions
- Backend permission decorator (`@require_permission()`)
- Frontend permission hook (`usePermission` with `can()`, `canAny()`, `canAll()`)
- Protected routes on both frontend and backend

### 2. Sales Management
- Record sale transactions with multiple payment methods (Cash, M-Pesa, Bank Transfer, Credit, Cheque)
- Customer type segmentation (walk-in, account, wholesale)
- Container deposit and return tracking
- Discount and tax calculation

### 3. Inventory Management
- Real-time stock tracking with min-level alerts
- Stock movement ledger (sale, purchase, adjustment, return, write-off)
- Automated stock level checks every 30 minutes
- Reorder point management

### 4. Purchase Orders
- Full PO lifecycle: draft → pending approval → approved/declined → received
- Approval workflow with rejection reasons
- Supplier and product association

### 5. Deliveries
- **Outbound**: Driver assignment, delivery zones, scheduled deliveries, signature capture
- **Inbound**: Supplier delivery receiving with expected vs. actual quantities

### 6. KRA eTIMS Integration (Kenya Revenue Authority)
- Invoice submission to KRA eTIMS system
- Status tracking: not_submitted → pending → submitted → accepted/rejected
- Automated retry job for failed submissions
- POC stub ready for production API integration

### 7. Receipt Dispatch
- Multi-channel receipt delivery: Print, SMS, WhatsApp
- SMS via Africa's Talking or Twilio (POC stubs)
- WhatsApp Business API integration (POC stub)
- Dispatch logging and failure tracking

### 8. Business Intelligence
- Daily automated sales aggregation (star schema)
- Revenue summary views
- Inventory status views
- Customer sales analytics
- Chart visualization with Recharts

### 9. Background Jobs (APScheduler)
- **BI Aggregator**: Runs at 00:05 daily — aggregates yesterday's sales into fact tables
- **KRA Submitter**: Retries pending/rejected invoice submissions
- **Stock Checker**: Runs every 30 minutes — monitors stock levels and creates alerts
- **DimDate Seeder**: Populates date dimension table

---

## Authentication Flow

1. User logs in via `/api/auth/login`
2. Backend validates credentials, returns JWT in HTTP-only cookie
3. Frontend stores no tokens (browser handles cookies)
4. On each request, JWT decorator validates token and fetches fresh permissions from DB
5. Frontend loads user profile + permissions via `/api/auth/me`
6. `AuthContext` provides user data globally
7. `ProtectedRoute` checks permissions before rendering pages
8. `usePermission` hook enables conditional UI rendering based on permissions

---

## Known Issues (from `system issues to fixed.md`)

1. **Login page**: Missing "show password" toggle
2. **Sales & Customers pages**: Empty/broken — no content rendering
3. **Reports page**: No charts appearing, "Run Report" button not functional
4. **Redirect issues**: Purchase Orders, Deliveries, System Logs, Backups, Audit Trail, Settings, and Receipts pages all redirect to dashboard (routes likely not defined in `App.jsx`)

---

## External Integrations (POC Stubs — Ready for Production)

| Integration | Current State | Production Target |
|---|---|---|
| **KRA eTIMS** | POC stub (fake reference) | `https://etims-api.kra.go.ke/etims-api/submitInvoice` |
| **SMS** | Console log stub | Africa's Talking or Twilio |
| **WhatsApp** | Console log stub | Meta WhatsApp Business API |
| **M-Pesa** | Referenced in payment methods | Safaricom Daraja API (not yet implemented) |

---

## Roles & Permissions

### Default Roles
| Role | Description |
|---|---|
| `system_admin` | Full system access including user management and backups |
| `business_owner` | Financial reports, PO approval, and dashboard access |
| `sales_staff` | Record sales, generate invoices, manage customer records |
| `inventory_staff` | Manage stock, receive deliveries, trigger reorders |
| `driver` | View and update assigned outbound deliveries |

### Permission Keys
`user.create`, `user.edit`, `user.delete`, `user.view`, `sale.create`, `sale.view`, `sale.refund`, `customer.manage`, `inventory.view`, `inventory.adjust`, `delivery.inbound.receive`, `delivery.outbound.update`, `po.create`, `po.approve`, `po.view`, `report.view`, `report.generate`, `system.backup`, `system.config`

---

## Project Status

- **Architecture**: Well-structured, production-ready patterns
- **Backend**: Complete API with RBAC, services, models, and scheduled jobs
- **Frontend**: Partial — core pages exist but several have rendering issues
- **Database**: Comprehensive schema with BI star schema and views
- **Integrations**: POC stubs in place, ready for production credentials
- **Testing**: Pytest setup with Factory Boy; frontend tests with Vitest
- **Documentation**: Minimal (empty README), but implementation logs exist

---

## Business Context

This system is designed for a **Kenyan water business** that:
- Packs and sells packaged water (various sizes: 500ml, 1L, 5L, 10L, 20L)
- Offers water refill services
- Sells containers and packaging materials
- Manages delivery zones and drivers
- Needs compliance with Kenya Revenue Authority (KRA) eTIMS tax reporting
- Accepts M-Pesa payments (dominant mobile money in Kenya)
- Tracks container deposits and returns (common in water bottle businesses)
