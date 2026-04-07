
-- ============================================================
-- AQUA BUSINESS MANAGEMENT SYSTEM - MYSQL SCHEMA v2.0
-- Sales, Inventory, BI, RBAC, KRA eTIMS Integration
-- Water Packing & Refilling Business
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- RBAC: PERMISSIONS + ROLES + JUNCTION
-- ============================================================

CREATE TABLE permissions (
    permission_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    permission_key  VARCHAR(100)  NOT NULL UNIQUE,
    module          VARCHAR(50)   NOT NULL,
    description     TEXT,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE roles (
    role_id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_name       VARCHAR(50)   NOT NULL UNIQUE,
    description     TEXT,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
    role_id         INT UNSIGNED NOT NULL,
    permission_id   INT UNSIGNED NOT NULL,
    granted_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(role_id),
    CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions(permission_id)
) ENGINE=InnoDB;

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
    user_id         INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(50)   NOT NULL UNIQUE,
    password_hash   VARCHAR(255)  NOT NULL,
    email           VARCHAR(100)  NOT NULL UNIQUE,
    full_name       VARCHAR(100)  NOT NULL,
    role_id         INT UNSIGNED  NOT NULL,
    phone           VARCHAR(20),
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMP     NULL,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP     NULL,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id)
) ENGINE=InnoDB;

CREATE INDEX idx_users_role   ON users(role_id);
CREATE INDEX idx_users_active ON users(is_active);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE audit_log (
    log_id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED    NULL,
    action          VARCHAR(100)    NOT NULL,
    table_name      VARCHAR(64)     NOT NULL,
    record_id       BIGINT UNSIGNED NOT NULL,
    old_value       JSON            NULL,
    new_value       JSON            NULL,
    ip_address      VARCHAR(45)     NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_audit_user          ON audit_log(user_id);
CREATE INDEX idx_audit_table_record  ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_created       ON audit_log(created_at);

-- ============================================================
-- CUSTOMERS
-- ============================================================

CREATE TABLE customers (
    customer_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100)  NOT NULL,
    customer_type   ENUM('walk_in','account','wholesale') NOT NULL DEFAULT 'walk_in',
    phone           VARCHAR(20),
    email           VARCHAR(100),
    address         TEXT,
    zone            VARCHAR(50),
    credit_limit    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    credit_balance  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    kra_pin         VARCHAR(20)   NULL,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP     NULL
) ENGINE=InnoDB;

CREATE INDEX idx_customers_type ON customers(customer_type);
CREATE INDEX idx_customers_zone ON customers(zone);

-- ============================================================
-- SUPPLIERS
-- ============================================================

CREATE TABLE suppliers (
    supplier_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100)  NOT NULL,
    supplier_type   ENUM('raw_water','packaging','equipment','maintenance','other') NOT NULL,
    kra_pin         VARCHAR(20)   NULL,
    payment_terms   TINYINT UNSIGNED NOT NULL DEFAULT 30,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    address         TEXT,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP     NULL
) ENGINE=InnoDB;

CREATE TABLE supplier_contacts (
    contact_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    supplier_id     INT UNSIGNED  NOT NULL,
    contact_name    VARCHAR(100)  NOT NULL,
    role            VARCHAR(50),
    phone           VARCHAR(20),
    email           VARCHAR(100),
    is_primary      BOOLEAN       NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_sc_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_sc_supplier ON supplier_contacts(supplier_id);

-- ============================================================
-- PRODUCTS
-- ============================================================

CREATE TABLE products (
    product_id        INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    sku               VARCHAR(50)   NOT NULL UNIQUE,
    name              VARCHAR(150)  NOT NULL,
    description       TEXT,
    category          ENUM('packaged_water','refill_service','container','packaging_material','equipment','bulk_water','other') NOT NULL,
    unit_of_measure   ENUM('litre','500ml','1L','5L','10L','20L','carton','bottle','unit') NOT NULL,
    is_refill         BOOLEAN       NOT NULL DEFAULT FALSE,
    price             DECIMAL(10,2) NOT NULL,
    container_deposit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    current_stock     INT           NOT NULL DEFAULT 0,
    min_stock_level   INT           NOT NULL DEFAULT 0,
    reorder_qty       INT           NOT NULL DEFAULT 0,
    is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at        TIMESTAMP     NULL
) ENGINE=InnoDB;

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_stock    ON products(current_stock);

CREATE TABLE product_suppliers (
    product_id      INT UNSIGNED NOT NULL,
    supplier_id     INT UNSIGNED NOT NULL,
    is_primary      BOOLEAN      NOT NULL DEFAULT FALSE,
    unit_cost       DECIMAL(10,2) NULL,
    lead_time_days  TINYINT UNSIGNED NULL,
    PRIMARY KEY (product_id, supplier_id),
    CONSTRAINT fk_ps_product  FOREIGN KEY (product_id)  REFERENCES products(product_id),
    CONSTRAINT fk_ps_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
) ENGINE=InnoDB;

-- ============================================================
-- SALE TRANSACTIONS
-- ============================================================

CREATE TABLE sale_transactions (
    transaction_id   INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    customer_id      INT UNSIGNED  NOT NULL,
    sales_staff_id   INT UNSIGNED  NOT NULL,
    transaction_date TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    subtotal         DECIMAL(12,2) NOT NULL,
    discount_amount  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_amount       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_amount     DECIMAL(12,2) NOT NULL,
    payment_method   ENUM('cash','mpesa','bank_transfer','credit','cheque') NOT NULL,
    payment_status   ENUM('pending','paid','partial','refunded','cancelled') NOT NULL DEFAULT 'pending',
    mpesa_ref        VARCHAR(50)   NULL,
    notes            TEXT          NULL,
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_st_customer FOREIGN KEY (customer_id)    REFERENCES customers(customer_id),
    CONSTRAINT fk_st_staff    FOREIGN KEY (sales_staff_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE INDEX idx_st_customer       ON sale_transactions(customer_id);
CREATE INDEX idx_st_staff          ON sale_transactions(sales_staff_id);
CREATE INDEX idx_st_date           ON sale_transactions(transaction_date);
CREATE INDEX idx_st_payment_status ON sale_transactions(payment_status);

CREATE TABLE sale_items (
    sale_item_id        INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    transaction_id      INT UNSIGNED  NOT NULL,
    product_id          INT UNSIGNED  NOT NULL,
    quantity            INT           NOT NULL,
    unit_price          DECIMAL(10,2) NOT NULL,
    discount            DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    subtotal            DECIMAL(12,2) GENERATED ALWAYS AS ((quantity * unit_price) - discount) STORED,
    containers_returned INT           NOT NULL DEFAULT 0,
    CONSTRAINT fk_si_transaction FOREIGN KEY (transaction_id) REFERENCES sale_transactions(transaction_id),
    CONSTRAINT fk_si_product     FOREIGN KEY (product_id)     REFERENCES products(product_id)
) ENGINE=InnoDB;

CREATE INDEX idx_si_transaction ON sale_items(transaction_id);
CREATE INDEX idx_si_product     ON sale_items(product_id);

-- ============================================================
-- INVOICES (KRA eTIMS)
-- ============================================================

CREATE TABLE invoices (
    invoice_id          INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    transaction_id      INT UNSIGNED  NOT NULL UNIQUE,
    invoice_number      VARCHAR(50)   NOT NULL UNIQUE,
    invoice_type        ENUM('standard','credit_note','proforma','consolidated') NOT NULL DEFAULT 'standard',
    invoice_date        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date            DATE          NULL,
    total_amount        DECIMAL(12,2) NOT NULL,
    tax_amount          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    kra_status          ENUM('not_submitted','pending','submitted','accepted','rejected') NOT NULL DEFAULT 'not_submitted',
    kra_reference       VARCHAR(100)  NULL UNIQUE,
    kra_submitted_at    TIMESTAMP     NULL,
    kra_accepted_at     TIMESTAMP     NULL,
    kra_error_log       TEXT          NULL,
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_inv_transaction FOREIGN KEY (transaction_id) REFERENCES sale_transactions(transaction_id)
) ENGINE=InnoDB;

CREATE INDEX idx_inv_kra_status ON invoices(kra_status);
CREATE INDEX idx_inv_date       ON invoices(invoice_date);

-- ============================================================
-- OUTBOUND DELIVERIES (to customers)
-- ============================================================

CREATE TABLE outbound_deliveries (
    delivery_id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transaction_id      INT UNSIGNED NOT NULL,
    driver_id           INT UNSIGNED NOT NULL,
    customer_id         INT UNSIGNED NOT NULL,
    scheduled_date      TIMESTAMP    NOT NULL,
    delivered_at        TIMESTAMP    NULL,
    delivery_zone       VARCHAR(50)  NULL,
    latitude            DECIMAL(10,7) NULL,
    longitude           DECIMAL(10,7) NULL,
    eta_minutes         INT          NULL COMMENT 'Estimated delivery time in minutes based on zone',
    status              ENUM('scheduled','in_transit','delivered','failed','rescheduled') NOT NULL DEFAULT 'scheduled',
    delivery_notes      TEXT         NULL,
    signature_captured  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_od_transaction FOREIGN KEY (transaction_id) REFERENCES sale_transactions(transaction_id),
    CONSTRAINT fk_od_driver      FOREIGN KEY (driver_id)      REFERENCES users(user_id),
    CONSTRAINT fk_od_customer    FOREIGN KEY (customer_id)    REFERENCES customers(customer_id)
) ENGINE=InnoDB;

CREATE INDEX idx_od_driver    ON outbound_deliveries(driver_id);
CREATE INDEX idx_od_customer  ON outbound_deliveries(customer_id);
CREATE INDEX idx_od_status    ON outbound_deliveries(status);
CREATE INDEX idx_od_scheduled ON outbound_deliveries(scheduled_date);

-- ============================================================
-- INBOUND DELIVERIES (from suppliers)
-- ============================================================

CREATE TABLE inbound_deliveries (
    delivery_id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    supplier_id         INT UNSIGNED NOT NULL,
    received_by         INT UNSIGNED NOT NULL,
    delivery_date       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    delivery_note_ref   VARCHAR(100) NULL,
    status              ENUM('pending','partial','complete','rejected') NOT NULL DEFAULT 'pending',
    notes               TEXT         NULL,
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ind_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id),
    CONSTRAINT fk_ind_receiver FOREIGN KEY (received_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE inbound_delivery_items (
    item_id             INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    delivery_id         INT UNSIGNED  NOT NULL,
    product_id          INT UNSIGNED  NOT NULL,
    quantity_expected   INT           NOT NULL,
    quantity_received   INT           NOT NULL,
    unit_cost           DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_idi_delivery FOREIGN KEY (delivery_id) REFERENCES inbound_deliveries(delivery_id),
    CONSTRAINT fk_idi_product  FOREIGN KEY (product_id)  REFERENCES products(product_id)
) ENGINE=InnoDB;

CREATE INDEX idx_idi_delivery ON inbound_delivery_items(delivery_id);
CREATE INDEX idx_idi_product  ON inbound_delivery_items(product_id);

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================

CREATE TABLE purchase_orders (
    purchase_order_id   INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    supplier_id         INT UNSIGNED  NOT NULL,
    requested_by        INT UNSIGNED  NOT NULL,
    approved_by         INT UNSIGNED  NULL,
    order_date          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expected_delivery   DATE          NULL,
    total_amount        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status              ENUM('draft','pending_approval','approved','declined','received','partial','cancelled') NOT NULL DEFAULT 'draft',
    approved_at         TIMESTAMP     NULL,
    rejection_reason    TEXT          NULL,
    notes               TEXT          NULL,
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_po_supplier  FOREIGN KEY (supplier_id)  REFERENCES suppliers(supplier_id),
    CONSTRAINT fk_po_requester FOREIGN KEY (requested_by) REFERENCES users(user_id),
    CONSTRAINT fk_po_approver  FOREIGN KEY (approved_by)  REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_status   ON purchase_orders(status);

CREATE TABLE purchase_order_items (
    po_item_id          INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id   INT UNSIGNED  NOT NULL,
    product_id          INT UNSIGNED  NOT NULL,
    quantity            INT           NOT NULL,
    unit_price          DECIMAL(10,2) NOT NULL,
    subtotal            DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    CONSTRAINT fk_poi_po      FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(purchase_order_id),
    CONSTRAINT fk_poi_product FOREIGN KEY (product_id)        REFERENCES products(product_id)
) ENGINE=InnoDB;

CREATE INDEX idx_poi_po ON purchase_order_items(purchase_order_id);

-- ============================================================
-- INVENTORY MOVEMENTS LEDGER
-- ============================================================

CREATE TABLE inventory_movements (
    movement_id     BIGINT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    product_id      INT UNSIGNED     NOT NULL,
    movement_type   ENUM('sale','purchase','adjustment','return','write_off','transfer','opening') NOT NULL,
    reference_type  ENUM('sale_transaction','inbound_delivery','manual','purchase_order') NULL,
    reference_id    INT UNSIGNED     NULL,
    quantity_change INT              NOT NULL,
    stock_after     INT              NOT NULL,
    performed_by    INT UNSIGNED     NOT NULL,
    notes           TEXT             NULL,
    created_at      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_im_product FOREIGN KEY (product_id)   REFERENCES products(product_id),
    CONSTRAINT fk_im_user    FOREIGN KEY (performed_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE INDEX idx_im_product ON inventory_movements(product_id);
CREATE INDEX idx_im_type    ON inventory_movements(movement_type);
CREATE INDEX idx_im_created ON inventory_movements(created_at);
CREATE INDEX idx_im_ref     ON inventory_movements(reference_type, reference_id);

-- ============================================================
-- STOCK ALERTS
-- ============================================================

CREATE TABLE stock_alerts (
    alert_id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id      INT UNSIGNED NOT NULL,
    alert_type      ENUM('low_stock','out_of_stock','reorder_triggered') NOT NULL,
    current_stock   INT          NOT NULL,
    threshold       INT          NOT NULL,
    is_resolved     BOOLEAN      NOT NULL DEFAULT FALSE,
    resolved_at     TIMESTAMP    NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sa_product FOREIGN KEY (product_id) REFERENCES products(product_id)
) ENGINE=InnoDB;

CREATE INDEX idx_sa_product  ON stock_alerts(product_id);
CREATE INDEX idx_sa_resolved ON stock_alerts(is_resolved);

-- ============================================================
-- BI: DATE DIMENSION
-- ============================================================

CREATE TABLE dim_date (
    date_id           INT UNSIGNED PRIMARY KEY,
    full_date         DATE         NOT NULL UNIQUE,
    day_of_week       TINYINT      NOT NULL,
    day_name          VARCHAR(10)  NOT NULL,
    week_of_year      TINYINT      NOT NULL,
    month_num         TINYINT      NOT NULL,
    month_name        VARCHAR(10)  NOT NULL,
    quarter           TINYINT      NOT NULL,
    year              SMALLINT     NOT NULL,
    is_weekend        BOOLEAN      NOT NULL,
    is_public_holiday BOOLEAN      NOT NULL DEFAULT FALSE,
    holiday_name      VARCHAR(50)  NULL
) ENGINE=InnoDB;

-- ============================================================
-- BI: FACT TABLES
-- ============================================================

CREATE TABLE fact_daily_sales (
    fact_id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    date_id           INT UNSIGNED    NOT NULL,
    product_id        INT UNSIGNED    NOT NULL,
    customer_type     ENUM('walk_in','account','wholesale') NOT NULL,
    payment_method    ENUM('cash','mpesa','bank_transfer','credit','cheque') NOT NULL,
    units_sold        INT             NOT NULL DEFAULT 0,
    gross_revenue     DECIMAL(14,2)   NOT NULL DEFAULT 0.00,
    discount_total    DECIMAL(14,2)   NOT NULL DEFAULT 0.00,
    tax_total         DECIMAL(14,2)   NOT NULL DEFAULT 0.00,
    net_revenue       DECIMAL(14,2)   NOT NULL DEFAULT 0.00,
    transaction_count INT             NOT NULL DEFAULT 0,
    CONSTRAINT fk_fds_date    FOREIGN KEY (date_id)    REFERENCES dim_date(date_id),
    CONSTRAINT fk_fds_product FOREIGN KEY (product_id) REFERENCES products(product_id)
) ENGINE=InnoDB;

CREATE UNIQUE INDEX idx_fds_unique ON fact_daily_sales(date_id, product_id, customer_type, payment_method);
CREATE INDEX idx_fds_date    ON fact_daily_sales(date_id);
CREATE INDEX idx_fds_product ON fact_daily_sales(product_id);

CREATE TABLE fact_daily_inventory (
    fact_id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    date_id           INT UNSIGNED    NOT NULL,
    product_id        INT UNSIGNED    NOT NULL,
    opening_stock     INT             NOT NULL,
    units_received    INT             NOT NULL DEFAULT 0,
    units_sold        INT             NOT NULL DEFAULT 0,
    units_adjusted    INT             NOT NULL DEFAULT 0,
    closing_stock     INT             NOT NULL,
    stockout_flag     BOOLEAN         NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_fdi_date    FOREIGN KEY (date_id)    REFERENCES dim_date(date_id),
    CONSTRAINT fk_fdi_product FOREIGN KEY (product_id) REFERENCES products(product_id)
) ENGINE=InnoDB;

CREATE UNIQUE INDEX idx_fdi_unique ON fact_daily_inventory(date_id, product_id);

-- ============================================================
-- BI VIEWS
-- ============================================================

CREATE OR REPLACE VIEW vw_revenue_summary AS
    SELECT
        d.full_date,
        d.month_name,
        d.year,
        d.quarter,
        p.category                      AS product_category,
        p.name                          AS product_name,
        SUM(f.units_sold)               AS total_units,
        SUM(f.gross_revenue)            AS gross_revenue,
        SUM(f.discount_total)           AS total_discounts,
        SUM(f.tax_total)                AS total_vat,
        SUM(f.net_revenue)              AS net_revenue,
        SUM(f.transaction_count)        AS transactions
    FROM fact_daily_sales  f
    JOIN dim_date           d ON d.date_id    = f.date_id
    JOIN products           p ON p.product_id = f.product_id
    GROUP BY d.full_date, d.month_name, d.year, d.quarter, p.category, p.name;

CREATE OR REPLACE VIEW vw_inventory_status AS
    SELECT
        p.product_id,
        p.sku,
        p.name,
        p.category,
        p.unit_of_measure,
        p.current_stock,
        p.min_stock_level,
        p.reorder_qty,
        p.price,
        (p.current_stock * p.price)     AS stock_value,
        CASE
            WHEN p.current_stock = 0                          THEN 'out_of_stock'
            WHEN p.current_stock <= p.min_stock_level         THEN 'low_stock'
            ELSE 'ok'
        END                             AS stock_status
    FROM products p
    WHERE p.deleted_at IS NULL;

CREATE OR REPLACE VIEW vw_customer_sales_summary AS
    SELECT
        c.customer_id,
        c.name                          AS customer_name,
        c.customer_type,
        c.zone,
        COUNT(st.transaction_id)        AS total_transactions,
        SUM(st.total_amount)            AS lifetime_value,
        MAX(st.transaction_date)        AS last_purchase_date,
        AVG(st.total_amount)            AS avg_basket_size
    FROM customers           c
    LEFT JOIN sale_transactions st ON st.customer_id = c.customer_id
    WHERE c.deleted_at IS NULL
    GROUP BY c.customer_id, c.name, c.customer_type, c.zone;

CREATE OR REPLACE VIEW vw_po_pipeline AS
    SELECT
        po.purchase_order_id,
        s.name                          AS supplier_name,
        u.full_name                     AS requested_by,
        a.full_name                     AS approved_by,
        po.order_date,
        po.expected_delivery,
        po.total_amount,
        po.status,
        po.approved_at,
        po.rejection_reason
    FROM purchase_orders  po
    JOIN suppliers         s ON s.supplier_id  = po.supplier_id
    JOIN users             u ON u.user_id       = po.requested_by
    LEFT JOIN users        a ON a.user_id       = po.approved_by;

CREATE OR REPLACE VIEW vw_kra_submission_queue AS
    SELECT
        i.invoice_id,
        i.invoice_number,
        i.invoice_type,
        i.invoice_date,
        i.total_amount,
        i.tax_amount,
        i.kra_status,
        i.kra_error_log,
        c.name                          AS customer_name,
        c.kra_pin                       AS customer_kra_pin,
        st.payment_method,
        st.mpesa_ref
    FROM invoices            i
    JOIN sale_transactions   st ON st.transaction_id = i.transaction_id
    JOIN customers           c  ON c.customer_id     = st.customer_id
    WHERE i.kra_status IN ('not_submitted', 'rejected');

-- ============================================================
-- REPORT RUN LOG (Replaces old FINANCIAL_REPORTS blob table)
-- ============================================================

CREATE TABLE financial_report_runs (
    run_id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    report_type     ENUM('daily_summary','monthly_pnl','inventory_valuation','kra_submission','customer_aging') NOT NULL,
    generated_by    INT UNSIGNED NOT NULL,
    period_start    DATE         NOT NULL,
    period_end      DATE         NOT NULL,
    export_format   ENUM('pdf','excel','csv') NULL,
    file_path       VARCHAR(500) NULL,
    generated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_frr_user FOREIGN KEY (generated_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

-- ============================================================
-- SEED: DEFAULT ROLES & PERMISSIONS
-- ============================================================

INSERT INTO roles (role_name, description) VALUES
    ('system_admin',   'Full system access including user management and backups'),
    ('business_owner', 'Financial reports, PO approval, and dashboard access'),
    ('sales_staff',    'Record sales, generate invoices, manage customer records'),
    ('inventory_staff','Manage stock, receive deliveries, trigger reorders'),
    ('driver',         'View and update assigned outbound deliveries');

INSERT INTO permissions (module, permission_key, description) VALUES
    ('users',      'user.create',               'Create new user accounts'),
    ('users',      'user.edit',                 'Edit user accounts'),
    ('users',      'user.delete',               'Deactivate user accounts'),
    ('users',      'user.view',                 'View user list'),
    ('sales',      'sale.create',               'Record a sale transaction'),
    ('sales',      'sale.view',                 'View sales transactions'),
    ('sales',      'sale.refund',               'Process a refund'),
    ('sales',      'customer.manage',           'Create and edit customer records'),
    ('inventory',  'inventory.view',            'View stock levels'),
    ('inventory',  'inventory.adjust',          'Manual stock adjustment'),
    ('inventory',  'delivery.inbound.receive',  'Receive inbound supplier deliveries'),
    ('inventory',  'delivery.inbound.view',     'View inbound delivery records'),
    ('inventory',  'delivery.outbound.update',  'Update outbound delivery status'),
    ('inventory',  'delivery.outbound.view',    'View outbound delivery records'),
    ('inventory',  'delivery.outbound.create',  'Create outbound delivery records'),
    ('delivery',   'delivery.view',             'View all deliveries'),
    ('purchases',  'po.create',                 'Create purchase orders'),
    ('purchases',  'po.approve',                'Approve or decline purchase orders'),
    ('purchases',  'po.view',                   'View purchase orders'),
    ('finance',    'report.view',               'View financial reports'),
    ('finance',    'report.generate',           'Generate and export financial reports'),
    ('receipts',   'receipt.issue',             'Issue and view receipts'),
    ('receipts',   'receipt.void',              'Void a receipt'),
    ('receipts',   'receipt.reprint',           'Reprint or resend a receipt'),
    ('system',     'system.backup',             'Trigger data backups'),
    ('system',     'system.config',             'Configure system settings'),
    ('system',     'system.audit',              'View audit trail logs'),
    ('system',     'system.logs',               'View system logs');

SET FOREIGN_KEY_CHECKS = 1;
