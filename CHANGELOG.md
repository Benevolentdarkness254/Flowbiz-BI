# FlowBiz BI — Implementation Changelog

## Date: April 7, 2026 (Supplier Management System)

### Summary
Added a complete supplier management system with full CRUD, approval workflow, contract tracking, and performance analytics. Inventory staff can create/edit supplier applications which are then submitted for owner approval. The system tracks contract periods, goods dealt with, supplier contacts, and provides detailed performance metrics including reliability scores, order history, and monthly spend trends.

---

### Supplier Management System

#### 1. `backend/app/models/enums.py` — Added SupplierApprovalStatus enum
**What changed:** Added `SupplierApprovalStatus` enum with values: `pending`, `approved`, `rejected`, `suspended`.

**Reasoning:** Suppliers need an approval workflow. New supplier applications start as `pending`, require owner approval to become `approved`, and can later be `suspended` or `rejected`.

#### 2. `backend/app/models/inventory.py` — Extended Supplier model
**What changed:** Added fields to the `Supplier` model:
- `contract_start` (Date) — Contract start date
- `contract_end` (Date) — Contract end date
- `goods_dealt_with` (Text) — Description of goods/services supplied
- `notes` (Text) — Additional notes
- `approval_status` (Enum) — Approval workflow state
- `approved_by` (FK to users) — Who approved the supplier
- `approved_at` (DateTime) — When approved
- `rejection_reason` (Text) — Reason for rejection

**Reasoning:** The original Supplier model only had basic info. The business needs to track contracts, approval status, and supplier performance.

#### 3. `database/migration_v4.sql` — New migration
**What changed:** Creates all new columns on the `suppliers` table. Sets existing suppliers to `approved` status.

#### 4. `backend/app/api/suppliers.py` — Complete rewrite with approval workflow
**What changed:**

**List/Get endpoints:**
- `GET /api/suppliers/` — Paginated list with `approval_status` and `is_active` filters
- `GET /api/suppliers/<id>` — Full supplier details including all contacts

**CRUD endpoints:**
- `POST /api/suppliers/` — Create supplier (starts as `pending`)
- `PUT /api/suppliers/<id>` — Update supplier (reverts to `pending` if approved supplier is modified)
- `DELETE /api/suppliers/<id>` — Soft-delete

**Approval workflow (owner only — `po.approve` permission):**
- `POST /api/suppliers/<id>/approve` — Approve pending supplier
- `POST /api/suppliers/<id>/reject` — Reject with required reason
- `POST /api/suppliers/<id>/suspend` — Suspend approved supplier
- `POST /api/suppliers/<id>/reinstate` — Reinstate suspended supplier

**Performance analytics:**
- `GET /api/suppliers/<id>/performance` — Returns:
  - Contract details (start, end, duration, goods dealt with)
  - Performance metrics (total orders, value, reliability score, avg lead time)
  - Recent orders (last 10)
  - Products supplied with pricing
  - Monthly spend trend (last 6 months)

**Reasoning:** The previous supplier API was basic — just list/create/update/delete. The new API adds the full approval workflow, contract tracking, and performance analytics needed for proper supplier management.

#### 5. `backend/app/__init__.py` — Already registered
**What changed:** No change needed — the `suppliers_bp` blueprint was already registered at `/api/suppliers`.

#### 6. `frontend/src/pages/Suppliers.jsx` — Complete rewrite
**What changed:** Full-featured supplier management page with:

**Supplier list table:**
- Columns: ID, Name, Type, Contact, Contract Period, Status, Actions
- Filter by approval status (All, Pending, Approved, Rejected, Suspended)
- Status badges with color coding

**Create/Edit modal:**
- Fields: Name, Supplier Type, KRA PIN, Payment Terms, Address, Contract Start/End, Goods Dealt With, Notes
- Dynamic contacts section — add/remove contact rows with name, role, phone, email, primary flag
- "Submit for Approval" button for new suppliers
- Edit button for existing suppliers (reverts to pending if approved)

**Approval workflow modals:**
- Approve/Reject/Suspend/Reinstate confirmation modals
- Required reason field for rejection

**Performance/Details modal (4 tabs):**
- **Overview:** Contract details table, performance metric cards (total orders, value, reliability, lead time), pie chart of order status distribution
- **Products:** Table of products supplied with unit cost, lead time, primary flag
- **Recent Orders:** Table of last 10 POs with this supplier
- **Monthly Spend:** Bar chart of spend over last 6 months

#### 7. `frontend/src/api/suppliers.js` — Extended API client
**What changed:** Added all new methods:
- `getSuppliers(params)` — List with filters
- `getSupplier(id)` — Get single supplier
- `createSupplier(data)` — Create
- `updateSupplier(id, data)` — Update
- `deleteSupplier(id)` — Soft-delete
- `approveSupplier(id)` — Approve
- `rejectSupplier(id, reason)` — Reject
- `suspendSupplier(id)` — Suspend
- `reinstateSupplier(id)` — Reinstate
- `getPerformance(id)` — Get performance analytics

#### 8. `frontend/src/App.jsx` — Added route
**What changed:** Added `/suppliers` route with `po.view` permission guard. Removed orphaned `EnhancedDeliveries` route.

#### 9. `frontend/src/nav.config.js` — Added nav item
**What changed:** Added "Suppliers" entry to sidebar navigation with `po.view` permission.

---

## Date: April 7, 2026 (Customer Creation Fix)

### Summary
Fixed customer creation 400 error caused by `customer_type` string-to-Enum conversion failure in the marshmallow schema.

---

### Customer Creation Fix

#### 1. `backend/app/schemas/sales.py` — Fixed CustomerSchema deserialization
**What changed:**
- Added `normalize_data` `@pre_load` hook that converts `customer_type` string (e.g. `"walk_in"`) to the `CustomerType` Enum before schema validation
- Added `get_customer_type` method for serializing the Enum back to string in API responses
- Added `credit_limit` string-to-float conversion in the same hook

**Reasoning:** The frontend sends `customer_type` as a plain string (`"walk_in"`, `"account"`, `"wholesale"`), but the Customer model's column is an Enum. SQLAlchemyAutoSchema with `load_instance=True` cannot auto-convert strings to Enums during deserialization, causing a 400 validation error.

#### 2. `backend/app/api/sales.py` — Fixed create_customer and update_customer endpoints
**What changed:**
- `create_customer`: Explicitly converts `customer_type` string to Enum before passing to schema
- `update_customer`: Converts `customer_type` string to Enum when setting the attribute

---

## Date: April 7, 2026 (Delivery ETA Auto-Fill)

### Summary
Added auto-estimated delivery time calculation during sale scheduling. The delivery datetime picker now enforces a minimum time based on the customer's zone ETA, preventing unrealistic delivery schedules.

---

### Delivery ETA Auto-Fill

#### 1. `frontend/src/pages/Sales.jsx` — Added ETA calculation and validation
**What changed:**

- Added `ZONE_ETA` constant mapping zones to estimated minutes (Zone A: 30, B: 45, C: 60, D: 90, default: 45)
- Added `calculateMinDeliveryTime(zone)` function that computes `now + zone ETA` and formats it for the datetime-local input
- Added `minDeliveryTime` state — the earliest allowed delivery datetime
- Added `estimatedEta` state — the zone's ETA in minutes for display
- Updated `handleCustomerSelect()` to auto-calculate minimum time when a customer with a zone is selected
- Added `handleZoneChange()` to recalculate when the zone is manually changed
- Added `min={minDeliveryTime}` attribute to the datetime picker — the browser blocks selection of earlier times
- Added info banner showing estimated delivery time and earliest possible datetime
- Added validation on submit that rejects delivery times before the minimum with a clear error message

**Reasoning:** Sales staff were able to schedule deliveries in the past or with unrealistic times. The zone-based ETA ensures deliveries are scheduled with enough time for the driver to reach the customer. The auto-fill removes guesswork and prevents scheduling errors.

**Before:**
```jsx
<Form.Control
  type="datetime-local"
  value={deliveryDate}
  onChange={e => setDeliveryDate(e.target.value)}
/>
// No minimum, no ETA display, no validation
```

**After:**
```jsx
<Form.Control
  type="datetime-local"
  min={minDeliveryTime}  // Browser blocks earlier times
  value={deliveryDate}
  onChange={e => setDeliveryDate(e.target.value)}
/>
<Form.Text>Must be at least {estimatedEta} minutes from now</Form.Text>
// Plus info banner with ETA and earliest datetime
```

---

## Date: April 7, 2026 (Charts & Graphs Update)

### Summary
Added comprehensive charts and graphs to all 5 role-based dashboards (Admin, Owner, Sales, Inventory, Driver). Each dashboard now features multiple visualizations including line charts, bar charts, pie charts, and area charts. Fixed SQLAlchemy query execution bugs and JWT identity handling in PO creation.

---

### Dashboard Charts & Graphs

#### 1. `backend/app/api/bi.py` — Enhanced all dashboard endpoints with chart data
**What changed:**

**`GET /bi/dashboard/sales`** — Added:
- `payment_method_breakdown` — pie chart data (count + total by method)
- `daily_sales_trend` — line/area chart data (revenue + transactions, last 7 days)
- `payment_status_distribution` — bar chart data (count by status)

**`GET /bi/dashboard/inventory`** — Added:
- `stock_by_category` — grouped bar chart (product count + total stock per category)
- `movement_type_distribution` — bar chart (count by movement type, last 30 days)
- `stock_level_distribution` — pie chart (healthy, low stock, out of stock)

**`GET /bi/dashboard/driver`** — Added:
- `weekly_trend` — line chart (total + delivered deliveries, last 7 days)
- `zone_distribution` — pie chart (delivery count by zone, last 30 days)

**`GET /bi/dashboard/admin`** — Added:
- `user_roles_distribution` — pie chart (user count per role)
- `audit_activity` — stacked area chart (creates, updates, deletes, last 7 days)
- `table_sizes` — horizontal stacked bar chart (data + index size per table, top 10)

**Reasoning:** Dashboards were showing only stat cards and tables. Charts provide at-a-glance insights — trends, distributions, and comparisons — that tables alone cannot convey.

#### 2. `frontend/src/pages/Dashboard.jsx` — Complete chart integration for all roles
**What changed:**

**Admin Dashboard:**
- **Pie chart** — User roles distribution with percentage labels
- **Stacked area chart** — Audit activity over 7 days (creates, updates, deletes)
- **Horizontal stacked bar chart** — Database table sizes (data vs indexes)

**Owner Dashboard:**
- **Line chart** — Revenue + transactions trend over 7 days
- **Pie chart** — Payment method breakdown by revenue with percentages
- **Bar chart** — Payment status distribution

**Sales Staff Dashboard:**
- **Area chart** — Daily revenue trend (last 7 days)
- **Bar chart** — Top selling products today
- **Pie chart** — Payment methods breakdown

**Inventory Staff Dashboard:**
- **Pie chart** — Stock health (healthy, low, out of stock)
- **Grouped bar chart** — Stock by category (products + total stock)
- **Bar chart** — Movement type distribution (last 30 days)

**Driver Dashboard:**
- **Line chart** — Weekly delivery trend (total + delivered)
- **Pie chart** — Delivery zone distribution with percentages

**Reasoning:** Each role gets visualizations relevant to their daily work. Charts use Recharts (already installed) with a consistent color palette.

---

### Bug Fixes

#### 3. `backend/app/api/bi.py` — Fixed SQLAlchemy query execution
**What changed:** Removed `db.session.execute()` wrapper from ORM query calls. The `.all()` method already executes the query and returns results. Wrapping it in `execute()` caused `ArgumentError: Executable SQL or text() construct expected, got []`.

**Affected queries:**
- `top_products` (sales dashboard)
- `payment_methods` (sales dashboard)
- `daily_sales` (sales dashboard)
- `payment_status` (sales dashboard)

**Before:**
```python
top_products = db.session.execute(
    db.session.query(...).all()  # .all() returns a list
)  # execute() expects SQL, not a list
```

**After:**
```python
top_products = db.session.query(...).all()  # Direct execution
```

---

#### 4. `backend/app/api/purchase_orders.py` — Fixed JWT identity in create_po
**What changed:** Changed `identity["user_id"]` to `int(get_jwt_identity())` in the `create_po` function.

**Reasoning:** `get_jwt_identity()` returns the string user_id stored in the JWT (e.g., `"1"`), not a dict. This is the same bug that was fixed in the approve/decline endpoints earlier.

---

## Date: April 7, 2026

### Summary
Added delivery scheduling during the sales flow. Sales staff can now optionally assign a driver, set delivery date/time, zone, and notes when completing a sale. The sale and delivery are created atomically in a single transaction.

---

### Delivery-at-Sale Integration

#### 1. `backend/app/schemas/sales.py` — Added delivery fields to CreateSaleSchema
**What changed:** Added `delivery_driver_id`, `delivery_date`, `delivery_zone`, and `delivery_notes` optional fields to the sale creation schema.

**Reasoning:** These fields allow the frontend to pass delivery scheduling data alongside the sale transaction. When present, the backend creates an outbound delivery record.

#### 2. `backend/app/services/sales_service.py` — Extended create_sale to create delivery
**What changed:**
- `create_sale()` now returns a tuple `(txn, delivery_id)` instead of just `txn`
- If `delivery_driver_id` and `delivery_date` are provided in the data dict, an `OutboundDelivery` record is created atomically with the sale
- Auto-calculates `eta_minutes` using `get_zone_eta()` from system settings
- Pulls delivery zone from the request or falls back to the customer's zone

**Reasoning:** Previously, creating a delivery required a separate API call after the sale. This change combines both operations into one atomic transaction, ensuring data consistency and reducing friction for the sales staff.

#### 3. `backend/app/api/sales.py` — Updated create_transaction endpoint
**What changed:**
- Now unpacks the `(txn, delivery_id)` tuple from `create_sale()`
- Returns `delivery_id` in the response when a delivery was created
- Added `GET /api/sales/drivers` endpoint — returns list of active drivers for the delivery assignment dropdown

#### 4. `frontend/src/api/sales.js` — Added getDrivers method
**What changed:** Added `getDrivers: () => api.get('/sales/drivers')` to the sales API client.

#### 5. `frontend/src/pages/Sales.jsx` — Added delivery scheduling to New Sale modal
**What changed:**
- Added collapsible "Schedule Delivery" accordion section in the New Sale modal
- Fields: Driver dropdown (fetched from API), date/time picker, delivery zone (auto-filled from selected customer), delivery notes
- Auto-fills delivery zone when a customer with a zone is selected
- Validates delivery fields only when "Schedule Delivery" is checked
- Shows success message with delivery ID when delivery is created
- Submit button text changes based on whether delivery is scheduled
- Only visible to users with `delivery.outbound.create` permission

---

## Date: April 6, 2026 (Major System Overhaul)

### Summary
Complete system overhaul: role-based dashboards, enhanced delivery tracking with OpenStreetMap, supplier integration in POs, simplified audit trail, fixed permission system, added bulk water product category, and cleaned up navigation.

---

### Phase 1: Database Schema Changes

#### 1. `database/migration_v3.sql` — New migration file
**What changed:** Created migration to add:
- `bulk_water` to `ProductCategory` enum in `products.category`
- `latitude DECIMAL(10,7)` and `longitude DECIMAL(10,7)` to `outbound_deliveries` for GPS tracking
- `eta_minutes INT` to `outbound_deliveries` for auto-estimated delivery times

**Reasoning:** Deliveries need GPS coordinates for map visualization and ETA calculation. Bulk water is a new product category for the water business.

#### 2. `database/schema_v2.sql` — Updated base schema
**What changed:** Added `bulk_water` to the products category enum and GPS/ETA columns to outbound_deliveries table definition.

#### 3. `backend/app/models/enums.py` — Added BULK_WATER
**What changed:** Added `BULK_WATER = 'bulk_water'` to `ProductCategory` enum.

#### 4. `backend/app/models/sales.py` — Extended OutboundDelivery model
**What changed:** Added `latitude`, `longitude`, and `eta_minutes` columns to the `OutboundDelivery` ORM model.

---

### Phase 2: Permission System Fix

#### 5. `backend/app/services/permission_service.py` — New service
**What changed:** Created canonical role-to-permission mapping service with:
- `ROLE_PERMISSION_MAP` — defines exact permissions for each role (business_owner, sales_staff, inventory_staff, driver)
- `seed_role_permissions()` — clears and re-seeds role_permissions table from the map
- `validate_permissions()` — checks for anomalies (missing, extra, or admin-level perms on non-admin roles)

**Reasoning:** The previous permission seeding was inconsistent — some roles had ALL permissions, breaking RBAC. This service is the single source of truth.

#### 6. `backend/app/cli.py` — Added `seed-permissions` command
**What changed:** New CLI command that re-seeds permissions and validates them.

#### 7. `backend/app/api/auth.py` — Added debug endpoint
**What changed:** Added `GET /api/auth/permissions/debug` (admin only) — returns all roles with their actual permissions for troubleshooting.

---

### Phase 3: Navigation Cleanup

#### 8. `frontend/src/nav.config.js` — Removed duplicate entries
**What changed:** Removed `Enhanced Deliveries` and `Suppliers` nav items. Kept single `Deliveries` entry.

---

### Phase 4: Supplier Integration in POs

#### 9. `backend/app/api/inventory.py` — Added supplier endpoints
**What changed:**
- `GET /api/inventory/suppliers` — list active suppliers with contact info
- `GET /api/inventory/suppliers/<id>/pricing` — return supplier's product prices from `product_suppliers` table

**Reasoning:** PO creation needed supplier details (name, contacts) and auto-filled pricing instead of raw ID numbers.

#### 10. `frontend/src/api/inventory.js` — Extended with supplier methods
**What changed:** Added `getSuppliers()` and `getSupplierPricing(supplierId)`.

#### 11. `frontend/src/pages/PurchaseOrders.jsx` — Complete rewrite
**What changed:**
- Replaced raw "Supplier ID" number input with a dropdown showing supplier names and phone numbers
- When supplier is selected, fetches their pricing and auto-fills unit prices in line items
- Shows supplier info bar (name, address, payment terms) in the modal header
- Shows "Supplier price: KES X" hint under product dropdown when supplier-specific pricing exists
- PO table now shows supplier names instead of IDs

---

### Phase 5: Role-Based Dashboards

#### 12. `backend/app/api/bi.py` — Added 4 role-specific dashboard endpoints
**What changed:**
- `GET /bi/dashboard/sales` — today's sales, top products, recent transactions
- `GET /bi/dashboard/inventory` — stock levels, alerts, recent movements, pending inbound deliveries
- `GET /bi/dashboard/driver` — assigned deliveries today, status breakdown
- `GET /bi/dashboard/admin` — system health (DB size, active users, errors, KRA pending, stock alerts, pending POs, active deliveries)

#### 13. `frontend/src/pages/Dashboard.jsx` — Complete redesign
**What changed:** 5 distinct dashboard views based on role:

**Admin:** System health panel (DB size, users, errors, KRA, stock alerts, POs, deliveries) + business KPI cards
**Owner:** Business KPI cards (revenue, transactions, stock alerts, pending approvals) + stock alerts
**Sales Staff:** Revenue/transaction cards, top products bar chart, recent transactions table, stock alerts
**Inventory Staff:** Active alerts, pending inbound, recent stock movements tables
**Driver:** Today's deliveries count, status breakdown cards, delivery route table

---

### Phase 6: Audit Trail Simplification

#### 14. `frontend/src/pages/AuditTrail.jsx` — Complete rewrite
**What changed:**
- Replaced 9-column raw JSON table with clean 5-column timeline (expand icon, timestamp, action, user, IP)
- Human-readable action descriptions ("Created sale_transactions #42" instead of raw action names)
- Expandable rows showing only fields that changed (from → to diff)
- Quick filter buttons (Today, This Week, All)
- Color-coded changes (red for old values, green for new)
- Chevron icons for expand/collapse

---

### Phase 7: Enhanced Deliveries with OpenStreetMap

#### 15. `frontend/` — Installed Leaflet dependencies
**What changed:** `npm install leaflet react-leaflet`

#### 16. `frontend/src/pages/Deliveries.jsx` — Complete redesign
**What changed:**
- **Left panel (7 cols):** OpenStreetMap with color-coded delivery markers (blue=scheduled, yellow=in_transit, green=delivered, red=failed)
- **Right panel (5 cols):** Clickable delivery list with status badges and ETA
- **Delivery detail modal:** Status progress bar (scheduled → in_transit → delivered), customer info with GPS coords, driver info, goods manifest table, delivery notes
- **ETA display:** Auto-calculated from `eta_minutes` field
- **Legend:** Color-coded status dots below the map
- **Inbound tab:** Unchanged supplier delivery table

#### 17. `backend/app/api/deliveries.py` — Updated and extended
**What changed:**
- Added `latitude`, `longitude`, `eta_minutes` to outbound deliveries list query
- Added `GET /api/deliveries/outbound/<id>/manifest` — lightweight endpoint returning just the goods manifest
- Updated `GET /api/deliveries/outbound/<id>` to include GPS and ETA fields

#### 18. `frontend/src/api/deliveries.js` — Added manifest method
**What changed:** Added `getDeliveryManifest(id)` method.

#### 19. `frontend/src/api/bi.js` — Added role-specific dashboard methods
**What changed:** Added `getSalesDashboard()`, `getInventoryDashboard()`, `getDriverDashboard()`, `getAdminDashboard()`.

---

## Issues Resolved

| Issue | Status | Fix |
|---|---|---|
| Deliveries page missing tracking, goods, ETA, map | ✅ Fixed | OpenStreetMap with markers, manifest modal, ETA, status timeline |
| Dashboard same for all roles | ✅ Fixed | 5 role-specific views (admin, owner, sales, inventory, driver) |
| No bulk water product category | ✅ Fixed | Added to enum, schema, and migration |
| Extra delivery tab in navbar | ✅ Fixed | Removed "Enhanced Deliveries" and "Suppliers" entries |
| Audit trail overwhelming with raw JSON | ✅ Fixed | Simplified to 5 columns with expandable diffs |
| No system health metrics for admin | ✅ Fixed | Added to admin dashboard (DB size, users, errors, KRA, etc.) |
| PO creation used raw supplier ID | ✅ Fixed | Dropdown with names, auto-filled pricing from supplier catalog |
| Permissions broken — all users got admin access | ✅ Fixed | Canonical ROLE_PERMISSION_MAP, seed-permissions CLI, debug endpoint |

---

## Date: April 3, 2026

 ### Summary
Fixed all broken and missing pages, added missing backend API endpoints, created new frontend pages, and wired up the complete navigation system. The application now has full CRUD for all core entities and all nav items resolve to actual pages instead of redirecting to the dashboard.

---

## Date: April 3, 2026 (Sidebar UI Enhancement)

### Summary
Redesigned the sidebar navigation with distinctive icons, improved styling, and better visual hierarchy.

### Frontend Changes

#### 1. `frontend/src/nav.config.js` — Replaced all nav icons
**What changed:** Replaced all 12 inline SVG icons with modern, stroke-based Lucide-style icons:
- **Dashboard** — Grid layout icon (was duplicate of sales)
- **Sales** — Shopping bag icon (was duplicate grid)
- **Customers** — Multi-person/people icon
- **Inventory** — 3D box/package icon
- **Purchase Orders** — Document with lines icon
- **Receipts** — Receipt with zigzag edges icon
- **Reports** — Bar chart icon
- **Deliveries** — Truck icon
- **Audit Trail** — Clock/timer icon
- **Backups** — Cloud upload icon
- **Settings** — Gear/cog icon
- **Users** — Group of people icon

All icons increased from 18px to 20px, use `stroke="currentColor"` with `strokeWidth="1.8"` for a cleaner, more modern look.

#### 2. `frontend/src/components/common/Sidebar.jsx` — Complete visual redesign
**What changed:**
- Background changed from Bootstrap `bg-dark` to deep slate (`#0f172a`)
- Sidebar width increased from 220px to 240px
- Added Flowbiz brand logo (layered diamond SVG in blue `#3b82f6`)
- Inactive link color changed from `text-white-50` to muted slate (`#94a3b8`)
- Active link color updated to blue accent (`#3b82f6`) instead of Bootstrap primary
- Icon wrapper with opacity transitions (0.7 inactive → 1.0 active/hover)
- Added `border-radius: 0.5rem` (rounded-2) on link items
- Hover state: subtle white overlay (`rgba(255,255,255,0.05)`) with lighter text
- Active state: blue tint background (`rgba(59,130,246,0.15)`) with blue left border
- All transitions use 0.15s ease for snappy feel
- Font weight: 500 default → 600 active

#### 3. `frontend/src/components/common/Sidebar.jsx` — Enhanced active state distinction
**What changed:**
- Active background changed from flat tint to blue gradient (`90deg, rgba(59,130,246,0.2) → rgba(59,130,246,0.08)`)
- Added blue glow box-shadow on active items (`0 0 12px rgba(59,130,246,0.15)`)
- Added subtle inner border via `inset box-shadow` for depth
- Added right-side accent bar (`::after` pseudo-element) — 3px blue pill on the right edge at 50% opacity
- Active icon gets `drop-shadow` glow effect and `scale(1.1)` zoom
- Active label gets subtle blue `text-shadow` for luminance
- Transition timing increased to 0.2s for smoother feel

---

## Date: April 3, 2026 (Database Seeding)

### Summary
Seeded the `role_permissions` junction table in the `flowbiz_bi` database. The tables, roles, permissions, and admin user already existed from a prior migration, but the `role_permissions` table was empty (0 rows), meaning no role had any permissions assigned — effectively breaking the entire RBAC system.

### What changed
Populated `role_permissions` with permission mappings for all 5 roles:

**system_admin (role_id=1):** ALL 34 permissions — full system access

**business_owner (role_id=2):** 12 permissions
- `sale.view`, `customer.manage`, `inventory.view`, `delivery.view`
- `po.approve`, `po.view`
- `report.view`, `report.generate`
- `receipt.issue`, `receipt.reprint`
- `system.audit`, `system.logs`

**sales_staff (role_id=3):** 9 permissions
- `sale.create`, `sale.view`, `sale.refund`
- `customer.manage`, `inventory.view`
- `delivery.outbound.view`, `delivery.outbound.create`
- `receipt.issue`, `receipt.reprint`

**inventory_staff (role_id=4):** 12 permissions
- `inventory.view`, `inventory.adjust`
- `delivery.inbound.receive`, `delivery.inbound.view`
- `delivery.outbound.update`, `delivery.outbound.view`, `delivery.outbound.create`, `delivery.view`
- `po.create`, `po.view`
- `receipt.issue`, `receipt.reprint`

**driver (role_id=5):** 3 permissions
- `delivery.outbound.update`, `delivery.outbound.view`, `delivery.view`

### Result
- 70 total role-permission mappings inserted
- RBAC system now functional — non-admin users will have actual permissions to check against
- Admin user (user_id=1, role=system_admin) now has all permissions through the junction table instead of relying solely on admin bypass logic

---

## Backend Changes

### 1. `backend/app/api/sales.py` — Added Customer CRUD endpoints
**What changed:** Added `GET /customers/<id>`, `PUT /customers/<id>`, and `DELETE /customers/<id>` endpoints.

**Reasoning:** The Customers page frontend needed update and delete capabilities. The backend only had list and create. The delete is a soft-delete (sets `deleted_at`) consistent with the schema design.

**Routes added:**
- `GET /api/sales/customers/<customer_id>` — Get single customer
- `PUT /api/sales/customers/<customer_id>` — Update customer fields
- `DELETE /api/sales/customers/<customer_id>` — Soft-delete customer

---

### 2. `backend/app/api/system.py` — Implemented from scratch (was empty)
**What changed:** Created the entire system API with 4 feature areas:

**Audit Trail endpoints:**
- `GET /api/system/audit` — Paginated audit log list with filters (table_name, action, user_id)
- `GET /api/system/audit/tables` — List distinct table names for filter dropdown

**Backups endpoints:**
- `GET /api/system/backups` — List existing backup files with metadata
- `POST /api/system/backups` — Trigger new mysqldump backup
- `DELETE /api/system/backups/<filename>` — Delete a backup file (with path traversal protection)

**Settings endpoints:**
- `GET /api/system/settings` — Return all system settings
- `PATCH /api/system/settings` — Update one or more settings

**System Logs endpoint:**
- `GET /api/system/logs` — Read recent application log entries with level filtering

**Reasoning:** The `system.py` file was completely empty (0 lines). The nav config referenced System Logs, Audit Trail, Backups, and Settings pages but there was no backend to serve them. These endpoints provide the data layer for all system management pages.

**Note:** The settings are stored in-memory for POC. In production, these should be persisted to a database table. The backup endpoint requires `mysqldump` to be installed on the server.

---

### 3. `backend/app/api/deliveries.py` — Created from scratch
**What changed:** New file with complete delivery management API:

**Outbound deliveries (to customers):**
- `GET /api/deliveries/outbound` — Paginated list with status filter
- `POST /api/deliveries/outbound` — Create delivery for a sale transaction
- `PATCH /api/deliveries/outbound/<id>` — Update delivery status (used by drivers)

**Inbound deliveries (from suppliers):**
- `GET /api/deliveries/inbound` — Paginated list with status/supplier filters
- `POST /api/deliveries/inbound` — Receive supplier delivery and auto-update stock

**Utility:**
- `GET /api/deliveries/drivers` — List users with driver role for assignment dropdowns

**Reasoning:** The deliveries nav item in the sidebar led nowhere. The database schema has `outbound_deliveries` and `inbound_deliveries` tables but no API existed to interact with them. The inbound delivery endpoint automatically updates product stock and creates inventory movement records.

---

### 4. `backend/app/__init__.py` — Registered new blueprints
**What changed:** Added imports and registration for `system_bp` and `deliveries_bp`.

**Reasoning:** New API modules need to be registered with the Flask app factory to be accessible.

---

### 5. `database/schema_v2.sql` — Added missing permissions
**What changed:** Added 8 new permission keys to the seed data:
- `delivery.inbound.view` — View inbound delivery records
- `delivery.outbound.view` — View outbound delivery records
- `delivery.outbound.create` — Create outbound delivery records
- `delivery.view` — View all deliveries (unified)
- `receipt.issue` — Issue and view receipts
- `receipt.void` — Void a receipt
- `receipt.reprint` — Reprint or resend a receipt
- `system.audit` — View audit trail logs
- `system.logs` — View system logs

**Reasoning:** The receipts API used `receipt.issue`, `receipt.void`, and `receipt.reprint` permissions that didn't exist in the seed data. The deliveries API needed `delivery.view`, `delivery.outbound.view`, `delivery.outbound.create`, and `delivery.inbound.view`. The system API needed `system.audit` and `system.logs`. Without these, the permission decorator would reject all requests even for admin users (since admin bypasses the decorator, but non-admin roles would have no way to get these permissions).

---

## Frontend Changes

### 6. `frontend/src/pages/Customers.jsx` — Complete rewrite
**What changed:** Fixed all bugs and added full CRUD:

**Bugs fixed:**
- Changed API call from `customersApi.getCustomers()` (hits `/api/customers` — doesn't exist) to `salesApi.getCustomers()` (hits `/api/sales/customers` — correct)
- Changed field names from `customer.full_name` → `customer.name` and `customer.phone_number` → `customer.phone` to match the backend model
- Removed navigation to `/customers/create` and `/customers/:id/edit` routes that don't exist

**Features added:**
- Create/Edit modal with all customer fields (name, type, phone, email, address, zone, credit_limit, kra_pin)
- Empty state message when no customers exist
- Additional table columns: Type, Zone, Credit Balance

**Reasoning:** The page was completely broken — it called a non-existent API endpoint and referenced field names that don't exist on the backend model. Instead of creating separate create/edit routes, a modal approach is cleaner and keeps the UX contained.

---

### 7. `frontend/src/pages/Sales.jsx` — Added New Sale modal
**What changed:** Added a comprehensive "New Sale" modal with:

- Customer selection dropdown (fetched from API)
- Payment method selector (Cash, M-Pesa, Bank Transfer, Credit, Cheque)
- Conditional M-Pesa reference field (shown only when M-Pesa is selected)
- Dynamic line items table with:
  - Product dropdown (shows name, SKU, and current stock)
  - Auto-fill unit price when product is selected
  - Quantity, unit price, and discount inputs
  - Per-row subtotal calculation
  - Add/remove row buttons
- Running total in the table footer
- Notes field
- Validation (customer required, all line items complete, M-Pesa ref required for M-Pesa)
- Empty state message when no sales exist

**Reasoning:** The "New Sale" button existed but had no `onClick` handler. A sale requires selecting a customer, adding products, and choosing a payment method — all of which need to be in a form. The modal approach keeps the user on the sales list page while creating a transaction.

---

### 8. `frontend/src/pages/Reports.jsx` — Enhanced with tabs and charts
**What changed:** Replaced single-page layout with a 3-tab interface:

**Tab 1 — Revenue:**
- Date range picker with "Run Report" button (unchanged)
- Added Bar Chart showing revenue by product category (alongside the existing Line Chart)
- Better empty state messaging

**Tab 2 — Customers (new):**
- Customer lifetime value table with columns: name, type, zone, transactions, lifetime value, avg basket, last purchase
- Data fetched from `/api/bi/customers` on tab enter

**Tab 3 — KRA Queue (new):**
- Table of invoices pending or failed KRA eTIMS submission
- Shows invoice number, type, date, customer, amount, tax, status, and error log
- Data fetched from `/api/bi/kra-queue` on tab enter

**Reasoning:** The original page only had a revenue chart that wouldn't render until data existed. Adding customer and KRA tabs makes the Reports page useful even before the BI aggregator has run. The bar chart by category gives additional insight beyond the time-series line chart.

---

### 9. `frontend/src/pages/PurchaseOrders.jsx` — Created from scratch
**What changed:** New page with:

- PO list table with status badges (draft, pending_approval, approved, declined, received, partial, cancelled)
- "New Purchase Order" modal with:
  - Supplier ID input
  - Expected delivery date
  - Line items table (product, qty, unit price, subtotal)
  - Auto-fill unit price from product catalog
  - Running total
  - Notes field
- Approve/Decline buttons for pending POs (permission-gated)
- Confirmation modal for approve/decline actions (decline requires a reason)

**Reasoning:** This was one of the pages that redirected to dashboard because no route or component existed. The PO workflow is critical for the procurement process.

---

### 10. `frontend/src/pages/Deliveries.jsx` — Created from scratch
**What changed:** New page with 2 tabs:

**Tab 1 — Outbound:**
- Delivery list table (customer, driver, zone, scheduled date, delivered date, status)
- "Update" button for non-delivered shipments (permission-gated)
- Update modal with status dropdown and notes field
- Auto-sets `delivered_at` timestamp when status is set to "delivered"

**Tab 2 — Inbound:**
- Supplier delivery list table (supplier, received by, date, item count, status)
- Read-only view (receiving is done via the backend API)

**Reasoning:** Delivery tracking is essential for the water business — drivers need to update delivery status and managers need visibility into both outbound and inbound logistics.

---

### 11. `frontend/src/pages/Receipts.jsx` — Created from scratch
**What changed:** New page with:

- Receipt list table (receipt #, customer, type, amount, payment method, date, KRA status)
- Voided receipts shown with reduced opacity and "Voided" badge
- "Void" button with confirmation modal and required reason
- "Resend" button with dispatch modal (SMS, WhatsApp, Email, Digital Display)
- Destination input for non-digital channels

**Reasoning:** Receipt management is needed for financial record-keeping and customer service (re-sending receipts). The void functionality is critical for correcting errors without deleting financial records.

---

### 12. `frontend/src/pages/AuditTrail.jsx` — Created from scratch
**What changed:** New page with:

- Audit log table with columns: ID, user, action, table, record ID, old value, new value, IP address, date
- Filter controls: table name dropdown (populated from API), action text input
- Pagination with Previous/Next buttons
- Color-coded action badges (danger for delete/void, success for create, warning for update, info for others)
- JSON-formatted old/new values in scrollable `<pre>` blocks

**Reasoning:** Audit trail is required for compliance and debugging. The ability to filter by table and action makes it practical to investigate specific changes.

---

### 13. `frontend/src/pages/Backups.jsx` — Created from scratch
**What changed:** New page with:

- "Create Backup" card with description and trigger button
- Success/error alerts for backup creation
- Existing backups table (filename, size, created date, delete button)
- Confirmation dialog before deleting a backup
- Human-readable file size formatting (MB/GB)

**Reasoning:** Database backup management is a critical system admin function. The page provides visibility into existing backups and a one-click way to create new ones.

---

### 14. `frontend/src/pages/Settings.jsx` — Created from scratch
**What changed:** New page with 2 tabs:

**Tab 1 — General:**
- Company info: name, KRA PIN, phone, address
- Financial: tax rate (with percentage display), currency, default low stock threshold
- Save button with success/error feedback

**Tab 2 — Integrations:**
- Toggle switches for M-Pesa, SMS, KRA eTIMS, and automatic backups
- KRA submission mode selector (auto/manual)
- Descriptive help text for each integration
- Save button with success/error feedback

**Reasoning:** System configuration needs a UI. The two-tab layout separates general business info from technical integration settings.

---

### 15. `frontend/src/App.jsx` — Added all missing routes
**What changed:** Added imports and routes for:
- `PurchaseOrders` → `/purchase-orders` (permission: `po.view`)
- `Deliveries` → `/deliveries` (permission: `delivery.view`)
- `Receipts` → `/receipts` (permission: `receipt.issue`)
- `AuditTrail` → `/system/audit` (permission: `system.audit`)
- `Backups` → `/system/backups` (permission: `system.backup`)
- `Settings` → `/settings` (permission: `system.config`)

**Reasoning:** These routes were referenced in the sidebar nav config but not defined in the router, causing all clicks on those items to fall through to the `*` catch-all and redirect to `/` (dashboard).

---

### 16. `frontend/src/nav.config.js` — Cleaned up nav items
**What changed:**
- Removed "System Logs" nav item (functionality merged into Settings/Backups pages)
- Reordered items to group related features (Deliveries moved after Purchase Orders)

**Reasoning:** The System Logs nav item pointed to `/system/logs` which had no page. The backend `/api/system/logs` endpoint exists for API access but doesn't need a dedicated nav item since logs can be viewed through the system API directly.

---

### 17. `frontend/src/api/sales.js` — Extended with customer CRUD and products
**What changed:** Added `getCustomer`, `updateCustomer`, `deleteCustomer`, and `getProducts` methods.

**Reasoning:** The Sales page needs products for the line item dropdown, and the Customers page needs update/delete endpoints.

---

### 18. `frontend/src/api/receipts.js` — Renamed dispatch method
**What changed:** Renamed `dispatch` to `dispatchReceipt` for consistency with other API method naming.

**Reasoning:** Consistent naming across all API client modules makes the codebase easier to navigate.

---

### 19. New API client files created:
- `frontend/src/api/purchaseOrders.js` — PO list, create, approve, decline
- `frontend/src/api/deliveries.js` — Outbound/inbound delivery CRUD
- `frontend/src/api/system.js` — Audit, backups, settings, logs

**Reasoning:** Each domain needs its own API client module for clean separation of concerns.

---

## Issues Resolved

| Issue | Status | Fix |
|---|---|---|
| Sales page empty | ✅ Fixed | Added New Sale modal with full form; added empty state message |
| Customers page empty/broken | ✅ Fixed | Corrected API endpoint, field names, added CRUD modal |
| Reports page no charts | ✅ Fixed | Added tabs with customer data and KRA queue; charts render when data exists |
| PO page redirects to dashboard | ✅ Fixed | Created page component and route |
| Deliveries page redirects to dashboard | ✅ Fixed | Created page component and route |
| Receipts page redirects to dashboard | ✅ Fixed | Created page component and route |
| Audit Trail page redirects to dashboard | ✅ Fixed | Created page component and route |
| Backups page redirects to dashboard | ✅ Fixed | Created page component and route |
| Settings page redirects to dashboard | ✅ Fixed | Created page component and route |
| System API empty | ✅ Fixed | Implemented audit, backup, settings, and logs endpoints |
| Missing permissions in DB | ✅ Fixed | Added 9 new permission keys to seed data |
| Show password missing on login | ✅ Already fixed | Was already implemented in Login.jsx |
| role_permissions table empty | ✅ Fixed | Seeded 70 role-permission mappings for all 5 roles |

---

## Date: April 6, 2026

### Summary
Fixed critical JWT identity handling bugs across multiple endpoints, added the Manage Users feature for admin CRUD of system users, and resolved database schema gaps (missing receipt tables).

---

### Bug Fixes

#### 1. `backend/app/api/purchase_orders.py` — Fixed JWT identity handling in approve/decline
**What changed:** Replaced `identity['user_id']` with `int(get_jwt_identity())` in both `approve_po` and `decline_po` functions.

**Reasoning:** `get_jwt_identity()` returns a **string** (the user_id stored as `str(user.user_id)` in the JWT), not a dict. Attempting `identity['user_id']` caused `TypeError: string indices must be integers, not 'str'`, making PO approval/decline completely broken.

**Before:**
```python
identity = get_jwt_identity()
po.approved_by = identity['user_id']  # TypeError!
```

**After:**
```python
user_id = int(get_jwt_identity())  # Convert string JWT identity back to int
po.approved_by = user_id
```

---

#### 2. `backend/app/api/auth.py` — Fixed phone parameter mismatch in create_user_route
**What changed:** Added parameter mapping to convert `phone` (from the request schema) to `phone_number` (expected by `create_user` service function).

**Reasoning:** The `CreateUserSchema` defines a `phone` field, but `auth_service.create_user()` expects `phone_number` as the parameter name. Passing `phone` directly caused `TypeError: create_user() got an unexpected keyword argument 'phone'`.

---

#### 3. `backend/app/api/deliveries.py` — Fixed broken ORM joins in outbound deliveries list
**What changed:** Replaced SQLAlchemy ORM `.join(text(...))` with raw SQL queries using `db.session.execute(text(...))`.

**Reasoning:** SQLAlchemy ORM's `.join()` expects mapped entity classes or selectable tables, not raw `text()` strings. This caused `ArgumentError: Expected mapped entity or selectable/table as join target`. Using raw SQL is cleaner for this multi-table join anyway.

---

#### 4. `database/` — Missing receipt tables created from supplementary schema files
**What changed:** Identified and documented that `receipts_addition.sql` and `receipts_channels.sql` must be imported after `schema_v2.sql`.

**Reasoning:** The `receipts`, `receipt_print_log`, `delivery_receipts`, and related tables were defined in separate SQL files, not in `schema_v2.sql`. The app crashed with `Table 'flowbiz_bi.receipts' doesn't exist` when accessing the Receipts page.

**Tables created:**
- `receipts` — Payment/deposit/refund receipts
- `delivery_receipts` — Proof-of-delivery receipts
- `receipt_print_log` — Dispatch tracking log
- `receipt_thermal_jobs` — Thermal printer job queue
- `receipt_sms_jobs` — SMS/WhatsApp dispatch jobs
- `receipt_pdf_jobs` — PDF/email dispatch jobs

**Views created:**
- `vw_invoice_payment_status` — Outstanding balance tracking
- `vw_container_deposit_ledger` — Container deposit liability per customer
- `vw_receipt_dispatch_summary` — Multi-channel dispatch status per receipt

---

### New Features

#### 5. `backend/app/api/auth.py` — Added user management endpoints
**What changed:** Added 6 new endpoints for full user CRUD:
- `GET /api/auth/users` — List all users (with `?include_deleted=true` option)
- `GET /api/auth/users/<id>` — Get single user
- `PUT /api/auth/users/<id>` — Edit user (name, email, phone, role, password, active status)
- `DELETE /api/auth/users/<id>` — Soft-delete (deactivate) user
- `POST /api/auth/users/<id>/restore` — Restore a deactivated user
- `GET /api/auth/roles` — List available roles for dropdown

**Safety guards:**
- Admin cannot delete or deactivate their own account (prevents lockout)
- Admin cannot change their own role (prevents lockout)
- Edit user doesn't require re-entering password (leave blank to keep existing)
- Email uniqueness enforced on update (excludes current user)

---

#### 6. `backend/app/cli.py` — Added `seed-users` CLI command
**What changed:** Added new CLI command `flask seed-users` that creates one demo user per role.

**Reasoning:** Needed test users with different roles to validate the permission system.

**Users created (all with password `FlowbizPOC2024!`):**
| Username | Role |
|---|---|
| `admin` | `system_admin` |
| `owner` | `business_owner` |
| `sales1` | `sales_staff` |
| `inventory1` | `inventory_staff` |
| `driver1` | `driver` |

---

#### 7. `frontend/src/pages/ManageUsers.jsx` — Created from scratch
**What changed:** New admin page for user management with:
- User list table with columns: ID, username, full name, email, phone, role badge, status, last login, actions
- Create/Edit modal with all user fields, role dropdown, password field with show/hide toggle
- Deactivate (soft-delete) with confirmation modal
- Restore deactivated users
- Deleted users shown with reduced opacity and "Deleted" badge
- Role badges color-coded (danger for admin, primary for owner, etc.)

---

#### 8. `frontend/src/api/users.js` — Created new API client
**What changed:** New API client module with methods for all user management operations.

---

#### 9. `frontend/src/App.jsx` — Added Manage Users route
**What changed:** Added import and route for `ManageUsers` at `/users` with `user.view` permission guard.

---

#### 10. `frontend/src/nav.config.js` — Added Users nav item
**What changed:** Added "Users" entry to sidebar navigation with `user.view` permission and multi-person icon.

---

## Issues Resolved

| Issue | Status | Fix |
|---|---|---|
| PO approve/decline throws TypeError | ✅ Fixed | Changed `identity['user_id']` to `int(get_jwt_identity())` |
| Create user throws TypeError (phone param) | ✅ Fixed | Map `phone` → `phone_number` before calling service |
| Deliveries outbound throws ArgumentError | ✅ Fixed | Replaced ORM joins with raw SQL |
| Receipts page crashes (table missing) | ✅ Fixed | Import `receipts_addition.sql` and `receipts_channels.sql` |
| No way to manage users from UI | ✅ Fixed | Created ManageUsers page with full CRUD |
| No test users for permission validation | ✅ Fixed | Added `flask seed-users` command |

---

## Next Steps (Not Included in This Change)

1. **External API integration** — Replace POC stubs in `kra_service.py` and `sms_service.py` with real API calls
2. **M-Pesa integration** — Implement Safaricom Daraja API for STK Push payments
3. **System Logs page** — Create a dedicated page for viewing application logs (backend endpoint exists)
4. **Product/Supplier management pages** — CRUD UI for products and suppliers
5. **Inbound delivery receiving form** — UI for receiving supplier deliveries with stock updates
6. **Export functionality** — PDF/Excel export for reports
7. **Settings persistence** — Move settings from in-memory to database table

