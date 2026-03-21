-- ============================================================
-- RECEIPT HANDLING — Addition to schema_v2.sql
-- Append after the invoices table definition
-- ============================================================

-- ============================================================
-- RECEIPTS
-- Covers: payment receipts, container deposit receipts,
--         refund receipts. One transaction can have multiple
--         receipts (partial payments, instalment accounts).
-- ============================================================

CREATE TABLE receipts (
    receipt_id          INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    receipt_number      VARCHAR(50)   NOT NULL UNIQUE,           -- e.g. RCP-20260319-0042
    receipt_type        ENUM('payment','deposit','refund') NOT NULL,
    transaction_id      INT UNSIGNED  NOT NULL,                  -- FK → sale_transactions
    invoice_id          INT UNSIGNED  NULL,                      -- optional link; NULL for deposit-only receipts
    issued_by           INT UNSIGNED  NOT NULL,                  -- FK → users (cashier/sales staff)
    customer_id         INT UNSIGNED  NOT NULL,                  -- denormalised for fast lookup

    -- Amounts
    amount_paid         DECIMAL(12,2) NOT NULL,
    balance_before      DECIMAL(12,2) NOT NULL,                  -- customer credit_balance snapshot before
    balance_after       DECIMAL(12,2) NOT NULL,                  -- customer credit_balance snapshot after

    -- Payment details (mirrors sale_transactions but scoped to this receipt)
    payment_method      ENUM('cash','mpesa','bank_transfer','credit','cheque') NOT NULL,
    mpesa_ref           VARCHAR(50)   NULL,                      -- M-Pesa transaction code

    -- Container deposit fields (populated when receipt_type = 'deposit')
    product_id          INT UNSIGNED  NULL,                      -- which container product
    containers_qty      INT           NULL,                      -- number of containers
    deposit_per_unit    DECIMAL(10,2) NULL,                      -- snapshot of product.container_deposit at time of issue

    -- Refund fields (populated when receipt_type = 'refund')
    original_receipt_id INT UNSIGNED  NULL,                      -- FK → receipts (the receipt being reversed)
    refund_reason       TEXT          NULL,

    -- KRA / compliance
    kra_status          ENUM('not_required','not_submitted','submitted','accepted','rejected') NOT NULL DEFAULT 'not_required',

    notes               TEXT          NULL,
    receipt_date        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    voided_at           TIMESTAMP     NULL,                      -- soft void; never hard-delete receipts
    voided_by           INT UNSIGNED  NULL,
    void_reason         TEXT          NULL,
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_rec_transaction   FOREIGN KEY (transaction_id)      REFERENCES sale_transactions(transaction_id),
    CONSTRAINT fk_rec_invoice       FOREIGN KEY (invoice_id)          REFERENCES invoices(invoice_id),
    CONSTRAINT fk_rec_issued_by     FOREIGN KEY (issued_by)           REFERENCES users(user_id),
    CONSTRAINT fk_rec_customer      FOREIGN KEY (customer_id)         REFERENCES customers(customer_id),
    CONSTRAINT fk_rec_product       FOREIGN KEY (product_id)          REFERENCES products(product_id),
    CONSTRAINT fk_rec_original      FOREIGN KEY (original_receipt_id) REFERENCES receipts(receipt_id),
    CONSTRAINT fk_rec_voided_by     FOREIGN KEY (voided_by)           REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE INDEX idx_rec_transaction    ON receipts(transaction_id);
CREATE INDEX idx_rec_customer       ON receipts(customer_id);
CREATE INDEX idx_rec_date           ON receipts(receipt_date);
CREATE INDEX idx_rec_type           ON receipts(receipt_type);
CREATE INDEX idx_rec_mpesa          ON receipts(mpesa_ref);          -- for M-Pesa reconciliation queries
CREATE INDEX idx_rec_kra_status     ON receipts(kra_status);

-- ============================================================
-- DELIVERY RECEIPTS
-- Proof that goods physically reached the customer.
-- Separate from payment receipts — a credit customer gets
-- a delivery receipt immediately but pays later.
-- ============================================================

CREATE TABLE delivery_receipts (
    delivery_receipt_id INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    receipt_number      VARCHAR(50)   NOT NULL UNIQUE,            -- e.g. DLV-20260319-0011
    delivery_id         INT UNSIGNED  NOT NULL,                   -- FK → outbound_deliveries
    transaction_id      INT UNSIGNED  NOT NULL,
    customer_id         INT UNSIGNED  NOT NULL,
    received_by_name    VARCHAR(100)  NULL,                       -- name of person who received (may differ from customer)
    received_by_phone   VARCHAR(20)   NULL,
    signature_data      TEXT          NULL,                       -- base64 SVG or PNG of signature
    containers_delivered INT          NOT NULL DEFAULT 0,
    containers_collected INT          NOT NULL DEFAULT 0,         -- empty containers taken back
    condition_notes     TEXT          NULL,                       -- e.g. "3 jerricans cracked on arrival"
    status              ENUM('signed','unsigned','disputed') NOT NULL DEFAULT 'unsigned',
    delivered_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_dr_delivery       FOREIGN KEY (delivery_id)    REFERENCES outbound_deliveries(delivery_id),
    CONSTRAINT fk_dr_transaction    FOREIGN KEY (transaction_id) REFERENCES sale_transactions(transaction_id),
    CONSTRAINT fk_dr_customer       FOREIGN KEY (customer_id)    REFERENCES customers(customer_id)
) ENGINE=InnoDB;

CREATE INDEX idx_dr_delivery     ON delivery_receipts(delivery_id);
CREATE INDEX idx_dr_customer     ON delivery_receipts(customer_id);
CREATE INDEX idx_dr_delivered_at ON delivery_receipts(delivered_at);

-- ============================================================
-- RECEIPT PRINT / DISPATCH LOG
-- Every time a receipt is printed, emailed, or sent via SMS
-- we log it. Supports reprint tracking and audit.
-- ============================================================

CREATE TABLE receipt_print_log (
    log_id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    receipt_id          INT UNSIGNED    NULL,                     -- FK → receipts
    delivery_receipt_id INT UNSIGNED    NULL,                     -- FK → delivery_receipts
    dispatch_channel    ENUM('thermal_printer','pdf_email','sms','whatsapp','digital_only') NOT NULL,
    dispatched_to       VARCHAR(100)    NULL,                     -- email / phone number
    dispatched_by       INT UNSIGNED    NOT NULL,                 -- FK → users
    template_version    VARCHAR(20)     NULL,                     -- e.g. 'v2.1' for template versioning
    status              ENUM('queued','sent','delivered','failed') NOT NULL DEFAULT 'queued',
    failure_reason      TEXT            NULL,
    dispatched_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_rpl_one_receipt CHECK (
        (receipt_id IS NOT NULL) <> (delivery_receipt_id IS NOT NULL)
    ),

    CONSTRAINT fk_rpl_receipt        FOREIGN KEY (receipt_id)          REFERENCES receipts(receipt_id),
    CONSTRAINT fk_rpl_del_receipt    FOREIGN KEY (delivery_receipt_id) REFERENCES delivery_receipts(delivery_receipt_id),
    CONSTRAINT fk_rpl_dispatched_by  FOREIGN KEY (dispatched_by)       REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE INDEX idx_rpl_receipt     ON receipt_print_log(receipt_id);
CREATE INDEX idx_rpl_del_receipt ON receipt_print_log(delivery_receipt_id);
CREATE INDEX idx_rpl_dispatched  ON receipt_print_log(dispatched_at);

-- ============================================================
-- VIEW: outstanding balances (partial payment tracking)
-- Shows how much of each invoice has been covered by receipts
-- ============================================================

CREATE OR REPLACE VIEW vw_invoice_payment_status AS
    SELECT
        i.invoice_id,
        i.invoice_number,
        i.invoice_date,
        i.total_amount                              AS invoice_total,
        i.due_date,
        c.name                                      AS customer_name,
        c.customer_type,
        COALESCE(SUM(r.amount_paid), 0)             AS total_paid,
        (i.total_amount - COALESCE(SUM(r.amount_paid), 0)) AS balance_due,
        CASE
            WHEN COALESCE(SUM(r.amount_paid), 0) = 0           THEN 'unpaid'
            WHEN COALESCE(SUM(r.amount_paid), 0) >= i.total_amount THEN 'fully_paid'
            ELSE 'partial'
        END                                         AS payment_status,
        COUNT(r.receipt_id)                         AS receipt_count,
        MAX(r.receipt_date)                         AS last_payment_date
    FROM invoices           i
    JOIN sale_transactions  st ON st.transaction_id = i.transaction_id
    JOIN customers          c  ON c.customer_id     = st.customer_id
    LEFT JOIN receipts      r  ON r.transaction_id  = st.transaction_id
                               AND r.receipt_type   = 'payment'
                               AND r.voided_at      IS NULL
    GROUP BY i.invoice_id, i.invoice_number, i.invoice_date,
             i.total_amount, i.due_date, c.name, c.customer_type;

-- ============================================================
-- VIEW: container deposit ledger per customer
-- Tracks net deposit liability (deposits charged minus refunds)
-- ============================================================

CREATE OR REPLACE VIEW vw_container_deposit_ledger AS
    SELECT
        c.customer_id,
        c.name                                          AS customer_name,
        p.name                                          AS container_type,
        SUM(CASE WHEN r.receipt_type = 'deposit'
                 THEN r.containers_qty ELSE 0 END)      AS containers_out,
        SUM(CASE WHEN r.receipt_type = 'refund'
                 THEN r.containers_qty ELSE 0 END)      AS containers_returned,
        SUM(CASE WHEN r.receipt_type = 'deposit'
                 THEN r.containers_qty ELSE 0 END) -
        SUM(CASE WHEN r.receipt_type = 'refund'
                 THEN r.containers_qty ELSE 0 END)      AS net_containers_outstanding,
        SUM(CASE WHEN r.receipt_type = 'deposit'
                 THEN r.amount_paid ELSE 0 END)         AS total_deposit_charged,
        SUM(CASE WHEN r.receipt_type = 'refund'
                 THEN r.amount_paid ELSE 0 END)         AS total_deposit_refunded,
        SUM(CASE WHEN r.receipt_type = 'deposit'
                 THEN r.amount_paid ELSE 0 END) -
        SUM(CASE WHEN r.receipt_type = 'refund'
                 THEN r.amount_paid ELSE 0 END)         AS net_deposit_liability
    FROM receipts       r
    JOIN customers      c  ON c.customer_id  = r.customer_id
    LEFT JOIN products  p  ON p.product_id   = r.product_id
    WHERE r.receipt_type IN ('deposit', 'refund')
      AND r.voided_at IS NULL
    GROUP BY c.customer_id, c.name, p.name;

-- ============================================================
-- ADD permission for receipt operations
-- ============================================================

INSERT INTO permissions (module, permission_key, description) VALUES
    ('sales', 'receipt.issue',   'Issue payment and deposit receipts'),
    ('sales', 'receipt.reprint', 'Reprint or resend a receipt'),
    ('sales', 'receipt.void',    'Void an erroneous receipt');
