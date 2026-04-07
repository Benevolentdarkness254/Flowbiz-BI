-- ============================================================
-- MIGRATION: Add bulk_water category, GPS coords, and ETA
-- Run after schema_v2.sql + receipts_addition.sql + receipts_channels.sql
-- ============================================================

-- 1. Add 'bulk_water' to product category enum
ALTER TABLE products
    MODIFY COLUMN category ENUM(
        'packaged_water',
        'refill_service',
        'container',
        'packaging_material',
        'equipment',
        'bulk_water',
        'other'
    ) NOT NULL;

-- 2. Add GPS coordinates to outbound_deliveries
--    These are populated from the customer's location at delivery creation time
ALTER TABLE outbound_deliveries
    ADD COLUMN latitude DECIMAL(10,7) NULL AFTER delivery_zone,
    ADD COLUMN longitude DECIMAL(10,7) NULL AFTER latitude,
    ADD COLUMN eta_minutes INT NULL AFTER longitude;

-- 3. Create index on GPS fields for route queries
CREATE INDEX idx_od_gps ON outbound_deliveries(latitude, longitude);
CREATE INDEX idx_od_eta ON outbound_deliveries(eta_minutes);
