-- ============================================================
-- MIGRATION v4: Supplier management enhancements
-- Adds contract fields, approval workflow, and goods_dealt_with
-- ============================================================

ALTER TABLE suppliers
    ADD COLUMN contract_start DATE NULL AFTER address,
    ADD COLUMN contract_end DATE NULL AFTER contract_start,
    ADD COLUMN goods_dealt_with TEXT NULL AFTER contract_end,
    ADD COLUMN notes TEXT NULL AFTER goods_dealt_with,
    ADD COLUMN approval_status ENUM('pending','approved','rejected','suspended') NOT NULL DEFAULT 'pending' AFTER notes,
    ADD COLUMN approved_by INT UNSIGNED NULL AFTER approval_status,
    ADD COLUMN approved_at DATETIME NULL AFTER approved_by,
    ADD COLUMN rejection_reason TEXT NULL AFTER approved_at,
    ADD FOREIGN KEY (approved_by) REFERENCES users(user_id);

-- Set existing suppliers to approved
UPDATE suppliers SET approval_status = 'approved' WHERE approval_status = 'pending';
