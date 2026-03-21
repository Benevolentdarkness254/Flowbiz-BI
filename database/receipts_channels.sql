-- ============================================================
-- RECEIPT SUPPLEMENTS — append after receipts_addition.sql
-- Covers: gap-free sequencing, thermal POS metadata,
--         SMS body snapshots, multi-channel dispatch detail
-- ============================================================

-- ============================================================
-- RECEIPT SEQUENCE
-- Provides gap-free, per-day consecutive receipt numbers.
-- KRA requires no gaps in receipt numbering — using
-- AUTO_INCREMENT alone is not safe (rolled-back txns leave gaps).
-- Application must call next_receipt_number() inside the same
-- transaction that inserts the receipt row.
-- ============================================================

CREATE TABLE receipt_sequences (
    seq_date        DATE         NOT NULL,
    prefix          VARCHAR(10)  NOT NULL,                       -- 'RCP', 'DLV', 'DEP', 'RFD'
    last_seq        INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (seq_date, prefix)
) ENGINE=InnoDB;

-- Stored procedure: atomically increments and returns next number
-- Returns formatted string e.g. 'RCP-20260319-0043'
DELIMITER $$
CREATE PROCEDURE next_receipt_number(
    IN  p_prefix        VARCHAR(10),
    IN  p_date          DATE,
    OUT p_receipt_number VARCHAR(50)
)
BEGIN
    INSERT INTO receipt_sequences (seq_date, prefix, last_seq)
        VALUES (p_date, p_prefix, 1)
        ON DUPLICATE KEY UPDATE last_seq = last_seq + 1;

    SELECT CONCAT(
        p_prefix, '-',
        DATE_FORMAT(p_date, '%Y%m%d'), '-',
        LPAD(last_seq, 4, '0')
    )
    INTO p_receipt_number
    FROM receipt_sequences
    WHERE seq_date = p_date AND prefix = p_prefix;
END$$
DELIMITER ;

-- ============================================================
-- THERMAL POS METADATA
-- One row per receipt that was routed to a thermal printer.
-- Stores the rendered ESC/POS byte string so reprints are
-- identical to originals — important if logo or template changes.
-- ============================================================

CREATE TABLE receipt_thermal_jobs (
    job_id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    print_log_id        BIGINT UNSIGNED NOT NULL,               -- FK → receipt_print_log
    printer_station_id  VARCHAR(50)     NOT NULL,               -- e.g. 'POS-01', 'COUNTER-A'
    printer_model       VARCHAR(100)    NULL,                   -- e.g. 'Epson TM-T20III'
    paper_width_mm      TINYINT UNSIGNED NOT NULL DEFAULT 80,   -- 58mm or 80mm roll
    escpos_payload      MEDIUMBLOB      NOT NULL,               -- raw ESC/POS bytes
    char_width          TINYINT UNSIGNED NOT NULL DEFAULT 42,   -- chars per line at this width
    status              ENUM('queued','printing','done','jammed','error') NOT NULL DEFAULT 'queued',
    error_detail        TEXT            NULL,
    queued_at           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    printed_at          TIMESTAMP       NULL,
    CONSTRAINT fk_rtj_log FOREIGN KEY (print_log_id) REFERENCES receipt_print_log(log_id)
) ENGINE=InnoDB;

CREATE INDEX idx_rtj_log     ON receipt_thermal_jobs(print_log_id);
CREATE INDEX idx_rtj_station ON receipt_thermal_jobs(printer_station_id);
CREATE INDEX idx_rtj_status  ON receipt_thermal_jobs(status);

-- ============================================================
-- SMS / WHATSAPP DISPATCH DETAIL
-- Stores the exact message body that was sent.
-- Needed to prove content in disputes and for KRA audit trail.
-- Also tracks gateway-level delivery receipts (DLR).
-- ============================================================

CREATE TABLE receipt_sms_jobs (
    job_id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    print_log_id        BIGINT UNSIGNED NOT NULL,               -- FK → receipt_print_log
    gateway             VARCHAR(50)     NOT NULL,               -- e.g. 'AfricasTalking', 'Twilio', 'WA-Business'
    sender_id           VARCHAR(20)     NULL,                   -- shortcode or WhatsApp number
    recipient_number    VARCHAR(20)     NOT NULL,
    message_body        TEXT            NOT NULL,               -- snapshot of exact text sent
    message_type        ENUM('sms','whatsapp') NOT NULL DEFAULT 'sms',
    gateway_message_id  VARCHAR(100)    NULL UNIQUE,            -- gateway's own message ID for DLR lookup
    dlr_status          ENUM('pending','sent','delivered','read','failed','rejected') NOT NULL DEFAULT 'pending',
    dlr_received_at     TIMESTAMP       NULL,                   -- when gateway confirmed delivery
    cost_units          DECIMAL(8,4)    NULL,                   -- gateway billing units (e.g. AT credits)
    queued_at           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at             TIMESTAMP       NULL,
    CONSTRAINT fk_rsj_log FOREIGN KEY (print_log_id) REFERENCES receipt_print_log(log_id)
) ENGINE=InnoDB;

CREATE INDEX idx_rsj_log       ON receipt_sms_jobs(print_log_id);
CREATE INDEX idx_rsj_gateway_id ON receipt_sms_jobs(gateway_message_id);
CREATE INDEX idx_rsj_dlr       ON receipt_sms_jobs(dlr_status);

-- ============================================================
-- PDF / EMAIL DISPATCH DETAIL
-- Stores S3/storage path of the generated PDF and email
-- envelope details. PDF is generated once and reused for
-- reprints — path reference avoids regeneration cost.
-- ============================================================

CREATE TABLE receipt_pdf_jobs (
    job_id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    print_log_id        BIGINT UNSIGNED NOT NULL,               -- FK → receipt_print_log
    pdf_storage_path    VARCHAR(500)    NULL,                   -- e.g. s3://bucket/receipts/RCP-20260319-0043.pdf
    pdf_generated_at    TIMESTAMP       NULL,
    pdf_size_bytes      INT UNSIGNED    NULL,
    email_to            VARCHAR(100)    NULL,
    email_cc            VARCHAR(100)    NULL,
    email_subject       VARCHAR(200)    NULL,
    email_provider      VARCHAR(50)     NULL,                   -- e.g. 'SendGrid', 'Postmark'
    provider_message_id VARCHAR(100)    NULL UNIQUE,
    open_tracked        BOOLEAN         NOT NULL DEFAULT FALSE,
    opened_at           TIMESTAMP       NULL,
    status              ENUM('generating','ready','sent','opened','bounced','failed') NOT NULL DEFAULT 'generating',
    failure_reason      TEXT            NULL,
    queued_at           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at             TIMESTAMP       NULL,
    CONSTRAINT fk_rpj_log FOREIGN KEY (print_log_id) REFERENCES receipt_print_log(log_id)
) ENGINE=InnoDB;

CREATE INDEX idx_rpj_log    ON receipt_pdf_jobs(print_log_id);
CREATE INDEX idx_rpj_status ON receipt_pdf_jobs(status);

-- ============================================================
-- UPDATE: receipt_print_log — add digital_only channel detail
-- For 'digital_only', no child job table is needed.
-- The log row itself is the record (used for in-app display).
-- Add a column to record the in-app view URL or record ID.
-- ============================================================

ALTER TABLE receipt_print_log
    ADD COLUMN digital_ref VARCHAR(200) NULL
        COMMENT 'In-app URL or display token for digital_only receipts'
    AFTER template_version;

-- ============================================================
-- VIEW: receipt dispatch summary
-- For each receipt, shows all channels it was dispatched on
-- and their current delivery status — useful for the
-- customer service / resend flow.
-- ============================================================

CREATE OR REPLACE VIEW vw_receipt_dispatch_summary AS
    SELECT
        r.receipt_id,
        r.receipt_number,
        r.receipt_type,
        r.receipt_date,
        r.amount_paid,
        r.payment_method,
        c.name                                  AS customer_name,
        c.phone                                 AS customer_phone,
        c.email                                 AS customer_email,
        rpl.log_id                              AS dispatch_log_id,
        rpl.dispatch_channel,
        rpl.status                              AS dispatch_status,
        rpl.dispatched_at,
        rpl.dispatched_to,
        -- channel-specific status (coalesce from child tables)
        COALESCE(rtj.status,  rsj.dlr_status, rpj.status, rpl.status) AS channel_status,
        COALESCE(rtj.error_detail, rsj.message_body, rpj.failure_reason) AS channel_detail
    FROM receipts               r
    JOIN customers              c   ON c.customer_id   = r.customer_id
    LEFT JOIN receipt_print_log rpl ON rpl.receipt_id  = r.receipt_id
    LEFT JOIN receipt_thermal_jobs rtj ON rtj.print_log_id = rpl.log_id
    LEFT JOIN receipt_sms_jobs     rsj ON rsj.print_log_id = rpl.log_id
    LEFT JOIN receipt_pdf_jobs     rpj ON rpj.print_log_id = rpl.log_id
    WHERE r.voided_at IS NULL;

-- ============================================================
-- ADD thermal + SMS + PDF permissions
-- ============================================================

INSERT INTO permissions (module, permission_key, description) VALUES
    ('sales', 'receipt.thermal.reprint', 'Trigger a reprint on a POS thermal printer'),
    ('sales', 'receipt.sms.resend',      'Resend an SMS or WhatsApp receipt'),
    ('sales', 'receipt.pdf.download',    'Download or re-email a PDF receipt');
