-- ============================================================
-- FLOWBIZ BI — FAKE DATA SEED SCRIPT
-- Realistic Kenyan water business test data
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. ADDITIONAL USERS (admin already exists)
-- ============================================================

-- Hash is bcrypt for: Flowbiz123!
SET @pw = 'pbkdf2:sha256:1000000$gsNNUMR8t9moZ2NQ$5c98d0e6c5b51d9e80cb1cb780c8447d2c7027f1fd0435fcabce17c606fb5017';

INSERT INTO users (username, password_hash, email, full_name, role_id, phone, is_active) VALUES
('jane.owner',   @pw, 'jane@flowbiz.co.ke',   'Jane Muthoni',       2, '+254700111222', 1),
('john.sales',   @pw, 'john@flowbiz.co.ke',   'John Kamau',         3, '+254700333444', 1),
('mary.sales',   @pw, 'mary@flowbiz.co.ke',   'Mary Wanjiku',       3, '+254700555666', 1),
('peter.stock',  @pw, 'peter@flowbiz.co.ke',  'Peter Ochieng',      4, '+254700777888', 1),
('sam.driver',   @pw, 'sam@flowbiz.co.ke',    'Samuel Kiprop',      5, '+254700999000', 1),
('lucy.driver',  @pw, 'lucy@flowbiz.co.ke',   'Lucy Akinyi',        5, '+254700111333', 1);

-- ============================================================
-- 2. CUSTOMERS
-- ============================================================

INSERT INTO customers (name, customer_type, phone, email, address, zone, credit_limit, credit_balance, is_active) VALUES
('Walk-in Customer',          'walk_in',   NULL,           NULL,             NULL,            NULL,         0,        0, 1),
('Quick Mart Supermarket',    'account',   '+254711000001','info@quickmart.co.ke', 'Industrial Area, Nairobi',  'Nairobi CBD',     50000,  12500, 1),
('Naivas Westlands',          'account',   '+254711000002','orders@naivas.co.ke',  'Westlands, Nairobi',       'Westlands',       80000,  34000, 1),
('Carrefour Junction Mall',   'account',   '+254711000003','procurement@carrefour.co.ke', 'Westlands, Nairobi', 'Westlands',       100000, 0,     1),
('Mama Mboga Kiosk',          'walk_in',   '+254711000004',NULL,              'Kangemi, Nairobi',              'Kangemi',         0,      0,     1),
('Hotel Africana',            'account',   '+254711000005','purchases@hotelafricana.co.ke', 'Nairobi CBD',      'Nairobi CBD',     150000, 67000, 1),
('Blue Post Hotel',           'account',   '+254711000006','store@bluepost.co.ke',  'Thika Road, Nairobi',     'Thika Road',      120000, 0,     1),
('Java House - Kilimani',     'account',   '+254711000007','supply@javahouse.co.ke', 'Kilimani, Nairobi',      'Kilimani',        90000,  22000, 1),
('Artcaffe Junction',         'account',   '+254711000008','procurement@artcaffe.co.ke',  'Karen, Nairobi',    'Karen',           70000,  8500,  1),
('Wholesale Water Depot',     'wholesale', '+254711000009','sales@wholesalewater.co.ke', 'Mombasa Road, Nairobi', 'Mombasa Road',  200000, 145000,1),
('Kenyatta University Canteen','account',  '+254711000010','canteen@ku.ac.ke',      'Kahawa, Nairobi',         'Kahawa',          40000,  15000, 1),
('Mount Kenya Resort',        'account',   '+254711000011','kitchen@mtkenyaresort.co.ke', 'Nyeri',             'Nyeri',           60000,  0,     1),
('Catering Solutions Ltd',    'wholesale', '+254711000012','orders@cateringsolutions.co.ke', 'Eastleigh, Nairobi', 'Eastleigh',     180000, 92000, 1),
('Fresh Stop Minimart',       'walk_in',   '+254711000013',NULL,              'Langata, Nairobi',              'Langata',         0,      0,     1),
('Safari Park Hotel',         'account',   '+254711000014','stores@safaripark.co.ke', 'Runda, Nairobi',        'Runda',           200000, 55000, 1);

-- ============================================================
-- 3. SUPPLIERS
-- ============================================================

INSERT INTO suppliers (name, supplier_type, kra_pin, payment_terms, address, is_active) VALUES
('Crystal Clear Water Ltd',     'raw_water',    'P051234567X', 30, 'Enterprise Road, Industrial Area, Nairobi', 1),
('AquaPure Systems Kenya',      'raw_water',    'P051234568Y', 14, 'Mombasa Road, Nairobi',                    1),
('PackRight Containers Ltd',    'packaging',    'P051234569Z', 30, 'Likoni Road, Mombasa',                     1),
('BottleTech Supplies',         'packaging',    'P051234570A', 21, 'Nakuru Industrial Area',                   1),
('Kenya Water Equipment Co.',   'equipment',    'P051234571B', 45, 'Kirinyaga Road, Nairobi CBD',              1),
('FreshSource Distributors',    'raw_water',    'P051234572C', 30, 'Thika Industrial Park',                    1),
('CapSeal Packaging Ltd',       'packaging',    'P051234573D', 14, 'Eldoret Town',                             1);

-- ============================================================
-- 4. SUPPLIER CONTACTS
-- ============================================================

INSERT INTO supplier_contacts (supplier_id, contact_name, role, phone, email, is_primary) VALUES
(1, 'David Mwangi',    'Sales Manager',   '+254722000001', 'david@crystalclear.co.ke',  1),
(1, 'Grace Njeri',     'Accounts',        '+254722000002', 'grace@crystalclear.co.ke',  0),
(2, 'Hassan Abdi',     'Operations',      '+254722000003', 'hassan@aquapure.co.ke',     1),
(3, 'Susan Wambui',    'Sales Rep',       '+254722000004', 'susan@packright.co.ke',     1),
(3, 'James Omondi',    'Logistics',       '+254722000005', 'james@packright.co.ke',     0),
(4, 'Faith Chebet',    'Manager',         '+254722000006', 'faith@bottletech.co.ke',    1),
(5, 'Robert Kariuki',  'Technical Sales', '+254722000007', 'robert@kenyawater.co.ke',   1),
(6, 'Amina Mohamed',   'Sales Director',  '+254722000008', 'amina@freshsource.co.ke',   1),
(7, 'Brian Otieno',    'Account Manager', '+254722000009', 'brian@capseal.co.ke',       1);

-- ============================================================
-- 5. PRODUCTS
-- ============================================================

INSERT INTO products (sku, name, description, category, unit_of_measure, is_refill, price, container_deposit, current_stock, min_stock_level, reorder_qty, is_active) VALUES
('WTR-500ML',  'Pure Flow 500ml',        'Premium drinking water 500ml bottle',     'packaged_water',   '500ml',  0, 50,    0,   2400, 500,  1000, 1),
('WTR-1L',     'Pure Flow 1 Litre',      'Premium drinking water 1 litre bottle',   'packaged_water',   '1L',     0, 80,    0,   1800, 300,  800,  1),
('WTR-5L',     'Pure Flow 5 Litres',     'Family size drinking water 5L bottle',    'packaged_water',   '5L',     0, 250,   0,   600,  100,  300,  1),
('WTR-10L',    'Pure Flow 10 Litres',    'Office size drinking water 10L bottle',   'packaged_water',   '10L',    0, 450,   0,   350,  80,   200,  1),
('WTR-20L',    'Pure Flow 20 Litres',    'Large dispenser water 20L bottle',        'packaged_water',   '20L',    0, 350,   200, 480,  100,  250,  1),
('REF-20L',    'Water Refill 20L',       'Refill service for 20L customer bottle',  'refill_service',   '20L',    1, 150,   0,   0,    0,    0,    1),
('REF-10L',    'Water Refill 10L',       'Refill service for 10L customer bottle',  'refill_service',   '10L',    1, 100,   0,   0,    0,    0,    1),
('REF-5L',     'Water Refill 5L',        'Refill service for 5L customer bottle',   'refill_service',   '5L',     1, 70,    0,   0,    0,    0,    1),
('CON-20L',    '20L Water Bottle',       'Empty 20L water dispenser bottle',        'container',        'unit',   0, 800,   200, 120,  30,   50,   1),
('CON-10L',    '10L Water Bottle',       'Empty 10L water bottle',                  'container',        'unit',   0, 500,   150, 80,   20,   40,   1),
('CON-5L',     '5L Water Bottle',        'Empty 5L water bottle',                   'container',        'unit',   0, 300,   100, 60,   15,   30,   1),
('PKG-CAP',    'Bottle Caps (Pack 100)', 'Standard bottle caps pack of 100',        'packaging_material','carton',0, 350,   0,   45,   10,   20,   1),
('PKG-LABEL',  'Product Labels (Roll)',  'Branded product labels roll (500 pcs)',   'packaging_material','unit',   0, 1200,  0,   15,   5,    10,   1),
('PKG-SHRINK', 'Shrink Wrap (Roll)',     'Pallet shrink wrap roll',                 'packaging_material','unit',   0, 850,   0,   8,    3,    5,    1),
('PKG-CRATE',  'Bottle Crate (20L)',     'Plastic crate for 20L bottles (holds 6)', 'packaging_material','unit',   0, 1500,  300, 25,   5,    10,   1),
('EQU-PUMP',   'Water Transfer Pump',    'Electric water transfer pump',            'equipment',        'unit',   0, 15000, 0,   3,    1,    2,    1),
('EQU-FILTER', 'Water Filter Cartridge', 'Replacement filter cartridge',            'equipment',        'unit',   0, 4500,  0,   12,   3,    5,    1);

-- ============================================================
-- 6. PRODUCT-SUPPLIER RELATIONSHIPS
-- ============================================================

INSERT INTO product_suppliers (product_id, supplier_id, is_primary, unit_cost, lead_time_days) VALUES
(1, 1, 1, 25,   3),
(2, 1, 1, 40,   3),
(3, 1, 1, 120,  3),
(4, 1, 1, 220,  5),
(5, 1, 1, 170,  5),
(5, 2, 0, 165,  7),
(6, 1, 1, NULL, NULL),
(7, 1, 1, NULL, NULL),
(8, 1, 1, NULL, NULL),
(9, 3, 1, 400,  14),
(9, 4, 0, 380,  10),
(10, 3, 1, 250, 14),
(11, 3, 1, 150, 14),
(12, 7, 1, 180,  7),
(13, 7, 1, 600,  10),
(14, 4, 1, 450,  7),
(15, 4, 1, 800,  10),
(16, 5, 1, 8000, 21),
(17, 6, 1, 2200, 14);

-- ============================================================
-- 7. PURCHASE ORDERS (various statuses)
-- ============================================================

-- PO #1: Approved and received
INSERT INTO purchase_orders (supplier_id, requested_by, approved_by, order_date, expected_delivery, total_amount, status, approved_at, notes) VALUES
(1, 4, 1, '2026-03-15 10:00:00', '2026-03-18', 195000.00, 'received', '2026-03-15 14:00:00', 'Monthly water restock');

INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_price) VALUES
(1, 1, 1000, 25),
(1, 2, 800,  40),
(1, 3, 300,  120),
(1, 5, 250,  170);

-- PO #2: Approved, pending delivery
INSERT INTO purchase_orders (supplier_id, requested_by, approved_by, order_date, expected_delivery, total_amount, status, approved_at, notes) VALUES
(3, 4, 2, '2026-03-25 09:00:00', '2026-04-08', 84000.00, 'approved', '2026-03-25 16:00:00', 'Urgent: 20L bottle shortage');

INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_price) VALUES
(2, 9, 50, 400),
(2, 10, 20, 250),
(2, 15, 10, 800);

-- PO #3: Pending approval
INSERT INTO purchase_orders (supplier_id, requested_by, order_date, expected_delivery, total_amount, status, notes) VALUES
(6, 4, '2026-03-30 11:00:00', '2026-04-15', 44000.00, 'pending_approval', 'Filter cartridge replacement needed');

INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_price) VALUES
(3, 17, 20, 2200);

-- PO #4: Draft
INSERT INTO purchase_orders (supplier_id, requested_by, order_date, expected_delivery, total_amount, status, notes) VALUES
(7, 4, '2026-04-01 08:00:00', '2026-04-20', 28000.00, 'draft', 'Quarterly packaging supplies order');

INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_price) VALUES
(4, 12, 20, 350),
(4, 13, 10, 1200),
(4, 14, 5, 850);

-- PO #5: Declined
INSERT INTO purchase_orders (supplier_id, requested_by, approved_by, order_date, expected_delivery, total_amount, status, approved_at, rejection_reason, notes) VALUES
(5, 4, 2, '2026-03-20 10:00:00', '2026-04-10', 30000.00, 'declined', '2026-03-20 17:00:00', 'Budget not approved for Q2 equipment purchases', 'Water transfer pump replacement');

INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_price) VALUES
(5, 16, 2, 15000);

-- ============================================================
-- 8. INBOUND DELIVERIES (from suppliers — linked to PO #1 received)
-- ============================================================

INSERT INTO inbound_deliveries (supplier_id, received_by, delivery_date, delivery_note_ref, status, notes) VALUES
(1, 4, '2026-03-18 14:30:00', 'DN-CC-2026-0312', 'complete', 'Full delivery as per PO #1');

INSERT INTO inbound_delivery_items (delivery_id, product_id, quantity_expected, quantity_received, unit_cost) VALUES
(1, 1, 1000, 1000, 25),
(1, 2, 800,  800,  40),
(1, 3, 300,  300,  120),
(1, 5, 250,  250,  170);

-- ============================================================
-- 9. INVENTORY MOVEMENTS (from inbound delivery)
-- ============================================================

INSERT INTO inventory_movements (product_id, movement_type, reference_type, reference_id, quantity_change, stock_after, performed_by, notes) VALUES
(1, 'purchase', 'inbound_delivery', 1, 1000, 2400, 4, 'Received from Crystal Clear Water Ltd'),
(2, 'purchase', 'inbound_delivery', 1, 800,  1800, 4, 'Received from Crystal Clear Water Ltd'),
(3, 'purchase', 'inbound_delivery', 1, 300,  600,  4, 'Received from Crystal Clear Water Ltd'),
(5, 'purchase', 'inbound_delivery', 1, 250,  480,  4, 'Received from Crystal Clear Water Ltd');

-- ============================================================
-- 10. SALE TRANSACTIONS (various dates, customers, payment methods)
-- ============================================================

-- Sale #1: Walk-in, cash, single item
INSERT INTO sale_transactions (customer_id, sales_staff_id, transaction_date, subtotal, discount_amount, tax_amount, total_amount, payment_method, payment_status, notes) VALUES
(1, 2, '2026-03-28 09:15:00', 350, 0, 56, 406, 'cash', 'paid', NULL);
INSERT INTO sale_items (transaction_id, product_id, quantity, unit_price, discount) VALUES
(1, 5, 1, 350, 0);

-- Sale #2: Quick Mart, M-Pesa, multiple items
INSERT INTO sale_transactions (customer_id, sales_staff_id, transaction_date, subtotal, discount_amount, tax_amount, total_amount, payment_method, payment_status, mpesa_ref, notes) VALUES
(2, 2, '2026-03-28 10:30:00', 4200, 200, 640, 4640, 'mpesa', 'paid', 'QKL7H8X9Y2', 'Weekly restock');
INSERT INTO sale_items (transaction_id, product_id, quantity, unit_price, discount) VALUES
(2, 1, 48,  50,  0),
(2, 2, 24,  80,  0),
(2, 5, 10,  350, 100),
(2, 9, 2,   800, 100);

-- Sale #3: Naivas, credit
INSERT INTO sale_transactions (customer_id, sales_staff_id, transaction_date, subtotal, discount_amount, tax_amount, total_amount, payment_method, payment_status, notes) VALUES
(3, 3, '2026-03-29 08:00:00', 15600, 500, 2416, 17516, 'credit', 'pending', 'Net 30 terms');
INSERT INTO sale_items (transaction_id, product_id, quantity, unit_price, discount) VALUES
(3, 1, 96,  50,  0),
(3, 2, 48,  80,  0),
(3, 3, 20,  250, 0),
(3, 5, 20,  350, 300),
(3, 15, 4,  1500, 200);

-- Sale #4: Hotel Africana, bank transfer
INSERT INTO sale_transactions (customer_id, sales_staff_id, transaction_date, subtotal, discount_amount, tax_amount, total_amount, payment_method, payment_status, notes) VALUES
(6, 2, '2026-03-29 14:00:00', 28000, 1000, 4320, 31320, 'bank_transfer', 'paid', 'Monthly hotel supply');
INSERT INTO sale_items (transaction_id, product_id, quantity, unit_price, discount) VALUES
(4, 5, 40,  350, 0),
(4, 4, 20,  450, 0),
(4, 3, 40,  250, 500),
(4, 1, 100, 50,  500);

-- Sale #5: Java House, M-Pesa
INSERT INTO sale_transactions (customer_id, sales_staff_id, transaction_date, subtotal, discount_amount, tax_amount, total_amount, payment_method, payment_status, mpesa_ref, notes) VALUES
(8, 3, '2026-03-30 11:00:00', 8500, 300, 1312, 9512, 'mpesa', 'paid', 'SJK9M3N7P1', 'Weekly supply');
INSERT INTO sale_items (transaction_id, product_id, quantity, unit_price, discount) VALUES
(5, 5, 15,  350, 0),
(5, 1, 60,  50,  100),
(5, 2, 30,  80,  100),
(5, 3, 10,  250, 100);

-- Sale #6: Wholesale Water Depot, credit
INSERT INTO sale_transactions (customer_id, sales_staff_id, transaction_date, subtotal, discount_amount, tax_amount, total_amount, payment_method, payment_status, notes) VALUES
(10, 2, '2026-03-30 16:00:00', 52500, 2500, 8000, 58000, 'credit', 'partial', 'Bulk wholesale order');
INSERT INTO sale_items (transaction_id, product_id, quantity, unit_price, discount) VALUES
(6, 5, 100, 350, 1500),
(6, 4, 30,  450, 500),
(6, 3, 40,  250, 500);

-- Sale #7: Walk-in, refill service
INSERT INTO sale_transactions (customer_id, sales_staff_id, transaction_date, subtotal, discount_amount, tax_amount, total_amount, payment_method, payment_status, notes) VALUES
(1, 3, '2026-03-31 09:00:00', 450, 0, 72, 522, 'cash', 'paid', 'Customer brought own bottles');
INSERT INTO sale_items (transaction_id, product_id, quantity, unit_price, discount) VALUES
(7, 6, 3, 150, 0);

-- Sale #8: Artcaffe, M-Pesa
INSERT INTO sale_transactions (customer_id, sales_staff_id, transaction_date, subtotal, discount_amount, tax_amount, total_amount, payment_method, payment_status, mpesa_ref, notes) VALUES
(9, 2, '2026-03-31 13:30:00', 6800, 200, 1056, 7656, 'mpesa', 'paid', 'RTP4X6Y2Z8', 'Karen branch supply');
INSERT INTO sale_items (transaction_id, product_id, quantity, unit_price, discount) VALUES
(8, 5, 10,  350, 0),
(8, 1, 40,  50,  0),
(8, 2, 20,  80,  100),
(8, 3, 8,   250, 100);

-- Sale #9: Safari Park Hotel, bank transfer
INSERT INTO sale_transactions (customer_id, sales_staff_id, transaction_date, subtotal, discount_amount, tax_amount, total_amount, payment_method, payment_status, notes) VALUES
(15, 3, '2026-04-01 07:30:00', 35000, 1500, 5360, 38860, 'bank_transfer', 'paid', 'Large event order');
INSERT INTO sale_items (transaction_id, product_id, quantity, unit_price, discount) VALUES
(9, 5, 60,  350, 500),
(9, 4, 30,  450, 500),
(9, 1, 120, 50,  500);

-- Sale #10: Mama Mboga Kiosk, cash
INSERT INTO sale_transactions (customer_id, sales_staff_id, transaction_date, subtotal, discount_amount, tax_amount, total_amount, payment_method, payment_status, notes) VALUES
(5, 2, '2026-04-01 10:00:00', 1000, 0, 160, 1160, 'cash', 'paid', NULL);
INSERT INTO sale_items (transaction_id, product_id, quantity, unit_price, discount) VALUES
(10, 1, 10, 50,  0),
(10, 2, 5,  80,  0),
(10, 3, 2,  250, 0);

-- Sale #11: KU Canteen, credit
INSERT INTO sale_transactions (customer_id, sales_staff_id, transaction_date, subtotal, discount_amount, tax_amount, total_amount, payment_method, payment_status, notes) VALUES
(11, 3, '2026-04-01 12:00:00', 7200, 300, 1104, 8004, 'credit', 'pending', 'Monthly campus supply');
INSERT INTO sale_items (transaction_id, product_id, quantity, unit_price, discount) VALUES
(11, 5, 15,  350, 150),
(11, 1, 60,  50,  100),
(11, 2, 24,  80,  50);

-- Sale #12: Catering Solutions, cheque
INSERT INTO sale_transactions (customer_id, sales_staff_id, transaction_date, subtotal, discount_amount, tax_amount, total_amount, payment_method, payment_status, notes) VALUES
(13, 2, '2026-04-02 09:00:00', 42000, 2000, 6400, 46400, 'cheque', 'paid', 'Cheque #004521');
INSERT INTO sale_items (transaction_id, product_id, quantity, unit_price, discount) VALUES
(12, 5, 80,  350, 1000),
(12, 4, 20,  450, 500),
(12, 3, 20,  250, 500);

-- Sale #13: Fresh Stop, cash
INSERT INTO sale_transactions (customer_id, sales_staff_id, transaction_date, subtotal, discount_amount, tax_amount, total_amount, payment_method, payment_status, notes) VALUES
(14, 3, '2026-04-02 15:00:00', 1500, 0, 240, 1740, 'cash', 'paid', NULL);
INSERT INTO sale_items (transaction_id, product_id, quantity, unit_price, discount) VALUES
(13, 1, 20, 50,  0),
(13, 5, 2,  350, 0),
(13, 2, 5,  80,  0);

-- Sale #14: Blue Post Hotel, M-Pesa
INSERT INTO sale_transactions (customer_id, sales_staff_id, transaction_date, subtotal, discount_amount, tax_amount, total_amount, payment_method, payment_status, mpesa_ref, notes) VALUES
(7, 2, '2026-04-02 16:30:00', 18500, 800, 2832, 20532, 'mpesa', 'paid', 'XLM2P5Q8R3', 'Weekend event supply');
INSERT INTO sale_items (transaction_id, product_id, quantity, unit_price, discount) VALUES
(14, 5, 30,  350, 300),
(14, 4, 15,  450, 200),
(14, 3, 20,  250, 300);

-- Sale #15: Mount Kenya Resort, bank transfer
INSERT INTO sale_transactions (customer_id, sales_staff_id, transaction_date, subtotal, discount_amount, tax_amount, total_amount, payment_method, payment_status, notes) VALUES
(12, 3, '2026-04-03 08:00:00', 12000, 500, 1840, 13340, 'bank_transfer', 'paid', 'Nyeri branch delivery');
INSERT INTO sale_items (transaction_id, product_id, quantity, unit_price, discount) VALUES
(15, 5, 20,  350, 0),
(15, 1, 80,  50,  200),
(15, 2, 40,  80,  200),
(15, 3, 10,  250, 100);

-- ============================================================
-- 11. INVOICES (one per sale transaction)
-- ============================================================

INSERT INTO invoices (transaction_id, invoice_number, invoice_type, invoice_date, due_date, total_amount, tax_amount, kra_status, kra_reference) VALUES
(1,  'INV-20260328-0001', 'standard', '2026-03-28 09:15:00', NULL,        406,    56,   'accepted',  'KRA-ETIMS-001'),
(2,  'INV-20260328-0002', 'standard', '2026-03-28 10:30:00', NULL,        4640,   640,  'accepted',  'KRA-ETIMS-002'),
(3,  'INV-20260329-0003', 'standard', '2026-03-29 08:00:00', '2026-04-28', 17516,  2416, 'submitted', NULL),
(4,  'INV-20260329-0004', 'standard', '2026-03-29 14:00:00', NULL,        31320,  4320, 'accepted',  'KRA-ETIMS-004'),
(5,  'INV-20260330-0005', 'standard', '2026-03-30 11:00:00', NULL,        9512,   1312, 'accepted',  'KRA-ETIMS-005'),
(6,  'INV-20260330-0006', 'standard', '2026-03-30 16:00:00', '2026-04-29', 58000,  8000, 'pending',   NULL),
(7,  'INV-20260331-0007', 'standard', '2026-03-31 09:00:00', NULL,        522,    72,   'accepted',  'KRA-ETIMS-007'),
(8,  'INV-20260331-0008', 'standard', '2026-03-31 13:30:00', NULL,        7656,   1056, 'accepted',  'KRA-ETIMS-008'),
(9,  'INV-20260401-0009', 'standard', '2026-04-01 07:30:00', NULL,        38860,  5360, 'submitted', NULL),
(10, 'INV-20260401-0010', 'standard', '2026-04-01 10:00:00', NULL,        1160,   160,  'accepted',  'KRA-ETIMS-010'),
(11, 'INV-20260401-0011', 'standard', '2026-04-01 12:00:00', '2026-05-01', 8004,   1104, 'not_submitted', NULL),
(12, 'INV-20260402-0012', 'standard', '2026-04-02 09:00:00', NULL,        46400,  6400, 'accepted',  'KRA-ETIMS-012'),
(13, 'INV-20260402-0013', 'standard', '2026-04-02 15:00:00', NULL,        1740,   240,  'accepted',  'KRA-ETIMS-013'),
(14, 'INV-20260402-0014', 'standard', '2026-04-02 16:30:00', NULL,        20532,  2832, 'rejected',  NULL),
(15, 'INV-20260403-0015', 'standard', '2026-04-03 08:00:00', NULL,        13340,  1840, 'not_submitted', NULL);

-- ============================================================
-- 12. RECEIPTS (payment receipts for paid transactions)
-- ============================================================

INSERT INTO receipts (receipt_number, receipt_type, transaction_id, invoice_id, issued_by, customer_id, amount_paid, balance_before, balance_after, payment_method, mpesa_ref, kra_status, receipt_date) VALUES
('RCP-20260328-0001', 'payment', 1,  1,  2, 1, 406,    0,     0,     'cash',          NULL,         'not_required', '2026-03-28 09:15:00'),
('RCP-20260328-0002', 'payment', 2,  2,  2, 2, 4640,   12500, 7860,  'mpesa',         'QKL7H8X9Y2', 'not_required', '2026-03-28 10:30:00'),
('RCP-20260329-0004', 'payment', 4,  4,  2, 6, 31320,  67000, 35680, 'bank_transfer', NULL,         'not_required', '2026-03-29 14:00:00'),
('RCP-20260330-0005', 'payment', 5,  5,  3, 8, 9512,   22000, 12488, 'mpesa',         'SJK9M3N7P1', 'not_required', '2026-03-30 11:00:00'),
('RCP-20260330-0006', 'payment', 6,  6,  2, 10, 20000, 145000, 125000, 'credit',      NULL,         'not_required', '2026-03-30 16:00:00'),
('RCP-20260331-0007', 'payment', 7,  7,  3, 1, 522,    0,     0,     'cash',          NULL,         'not_required', '2026-03-31 09:00:00'),
('RCP-20260331-0008', 'payment', 8,  8,  2, 9, 7656,   8500,  844,   'mpesa',         'RTP4X6Y2Z8', 'not_required', '2026-03-31 13:30:00'),
('RCP-20260401-0009', 'payment', 9,  9,  3, 15, 38860, 55000, 16140, 'bank_transfer', NULL,         'not_required', '2026-04-01 07:30:00'),
('RCP-20260401-0010', 'payment', 10, 10, 2, 5, 1160,   0,     0,     'cash',          NULL,         'not_required', '2026-04-01 10:00:00'),
('RCP-20260402-0012', 'payment', 12, 12, 2, 13, 46400, 92000, 45600, 'cheque',        NULL,         'not_required', '2026-04-02 09:00:00'),
('RCP-20260402-0013', 'payment', 13, 13, 3, 14, 1740,   0,     0,     'cash',          NULL,         'not_required', '2026-04-02 15:00:00'),
('RCP-20260402-0014', 'payment', 14, 14, 2, 7, 20532,  0,     0,     'mpesa',         'XLM2P5Q8R3', 'not_required', '2026-04-02 16:30:00'),
('RCP-20260403-0015', 'payment', 15, 15, 3, 12, 13340, 0,     0,     'bank_transfer', NULL,         'not_required', '2026-04-03 08:00:00');

-- Container deposit receipt
INSERT INTO receipts (receipt_number, receipt_type, transaction_id, invoice_id, issued_by, customer_id, amount_paid, balance_before, balance_after, payment_method, product_id, containers_qty, deposit_per_unit, kra_status, receipt_date) VALUES
('RCP-20260328-0003', 'deposit', 2, 2, 2, 2, 1600, 12500, 14100, 'mpesa', 9, 2, 800, 'not_required', '2026-03-28 10:30:00');

-- ============================================================
-- 13. OUTBOUND DELIVERIES (linked to sales)
-- ============================================================

INSERT INTO outbound_deliveries (transaction_id, driver_id, customer_id, scheduled_date, delivered_at, delivery_zone, status, delivery_notes, signature_captured) VALUES
(2,  5, 2,  '2026-03-28 14:00:00', '2026-03-28 15:30:00', 'Nairobi CBD',   'delivered', 'Delivered to receiving bay', 1),
(3,  5, 3,  '2026-03-29 10:00:00', '2026-03-29 12:00:00', 'Westlands',     'delivered', 'Left with store manager',     1),
(4,  6, 6,  '2026-03-29 16:00:00', '2026-03-29 17:30:00', 'Nairobi CBD',   'delivered', 'Kitchen delivery',            1),
(5,  5, 8,  '2026-03-30 14:00:00', '2026-03-30 15:00:00', 'Kilimani',      'delivered', 'Bar stock delivery',          1),
(6,  6, 10, '2026-03-31 08:00:00', NULL,                   'Mombasa Road',  'in_transit', 'Large order - two trips needed', 0),
(9,  5, 15, '2026-04-01 09:00:00', '2026-04-01 10:30:00', 'Runda',         'delivered', 'Event setup delivery',        1),
(11, 6, 11, '2026-04-01 14:00:00', NULL,                   'Kahawa',        'scheduled', 'Campus delivery',             0),
(12, 5, 13, '2026-04-02 11:00:00', '2026-04-02 13:00:00', 'Eastleigh',     'delivered', 'Catering warehouse',          1),
(14, 6, 7,  '2026-04-03 08:00:00', NULL,                   'Thika Road',    'scheduled', 'Weekend event prep',          0),
(15, 5, 12, '2026-04-03 10:00:00', NULL,                   'Nyeri',         'scheduled', 'Inter-county delivery',       0);

-- ============================================================
-- 14. DELIVERY RECEIPTS (for delivered outbound deliveries)
-- ============================================================

INSERT INTO delivery_receipts (receipt_number, delivery_id, transaction_id, customer_id, received_by_name, received_by_phone, containers_delivered, containers_collected, status, delivered_at) VALUES
('DLV-20260328-0001', 1, 2,  2, 'James Oduor',   '+254711000099', 12, 2, 'signed', '2026-03-28 15:30:00'),
('DLV-20260329-0002', 2, 3,  3, 'Sarah Wanjiru', '+254711000098', 24, 0, 'signed', '2026-03-29 12:00:00'),
('DLV-20260329-0003', 3, 4,  6, 'Chef Michael',  '+254711000097', 40, 5, 'signed', '2026-03-29 17:30:00'),
('DLV-20260330-0004', 4, 5,  8, 'Store Manager', '+254711000096', 15, 3, 'signed', '2026-03-30 15:00:00'),
('DLV-20260401-0005', 6, 9,  15, 'Reception',     '+254711000095', 60, 0, 'signed', '2026-04-01 10:30:00'),
('DLV-20260402-0006', 8, 12, 13, 'Warehouse',     '+254711000094', 80, 10, 'signed', '2026-04-02 13:00:00');

-- ============================================================
-- 15. RECEIPT PRINT LOG (dispatch records)
-- ============================================================

INSERT INTO receipt_print_log (receipt_id, delivery_receipt_id, dispatch_channel, dispatched_to, dispatched_by, template_version, status, dispatched_at) VALUES
(1,  NULL, 'thermal_printer', NULL, 2, 'v2.1', 'delivered', '2026-03-28 09:15:00'),
(2,  NULL, 'sms',             '+254711000001', 2, 'v2.1', 'delivered', '2026-03-28 10:35:00'),
(4,  NULL, 'pdf_email',       'purchases@hotelafricana.co.ke', 2, 'v2.1', 'sent', '2026-03-29 14:05:00'),
(5,  NULL, 'whatsapp',        '+254711000007', 3, 'v2.1', 'delivered', '2026-03-30 11:05:00'),
(7,  NULL, 'thermal_printer', NULL, 3, 'v2.1', 'delivered', '2026-03-31 09:00:00'),
(9,  NULL, 'pdf_email',       'stores@safaripark.co.ke', 3, 'v2.1', 'sent', '2026-04-01 07:35:00'),
(10, NULL, 'thermal_printer', NULL, 2, 'v2.1', 'delivered', '2026-04-01 10:00:00'),
(12, NULL, 'sms',             '+254711000013', 2, 'v2.1', 'delivered', '2026-04-02 15:05:00'),
(13, NULL, 'whatsapp',        '+254711000014', 3, 'v2.1', 'delivered', '2026-04-02 16:35:00');

-- Delivery receipt dispatch
INSERT INTO receipt_print_log (receipt_id, delivery_receipt_id, dispatch_channel, dispatched_to, dispatched_by, template_version, status, dispatched_at) VALUES
(NULL, 1, 'sms', '+254711000001', 2, 'v2.1', 'delivered', '2026-03-28 15:35:00'),
(NULL, 2, 'sms', '+254711000002', 2, 'v2.1', 'delivered', '2026-03-29 12:05:00'),
(NULL, 4, 'whatsapp', '+254711000007', 3, 'v2.1', 'delivered', '2026-03-30 15:05:00');

-- ============================================================
-- 16. STOCK ALERTS
-- ============================================================

INSERT INTO stock_alerts (product_id, alert_type, current_stock, threshold, is_resolved, created_at) VALUES
(14, 'low_stock', 8, 3, 0, '2026-04-01 08:00:00'),
(15, 'low_stock', 25, 5, 0, '2026-04-01 08:00:00'),
(16, 'low_stock', 3, 1, 0, '2026-03-28 08:00:00');

-- ============================================================
-- 17. AUDIT LOG (sample entries)
-- ============================================================

INSERT INTO audit_log (user_id, action, table_name, record_id, old_value, new_value, ip_address, created_at) VALUES
(1, 'create', 'purchase_order', 1, NULL, '{"supplier_id":1,"total_amount":195000,"status":"draft"}', '192.168.1.10', '2026-03-15 10:00:00'),
(2, 'update', 'purchase_order', 1, '{"status":"draft"}', '{"status":"approved"}', '192.168.1.10', '2026-03-15 14:00:00'),
(4, 'create', 'inbound_delivery', 1, NULL, '{"supplier_id":1,"status":"pending"}', '192.168.1.20', '2026-03-18 14:30:00'),
(4, 'update', 'inbound_delivery', 1, '{"status":"pending"}', '{"status":"complete"}', '192.168.1.20', '2026-03-18 15:00:00'),
(2, 'create', 'sale_transaction', 1, NULL, '{"customer_id":1,"total_amount":406}', '192.168.1.30', '2026-03-28 09:15:00'),
(2, 'create', 'sale_transaction', 2, NULL, '{"customer_id":2,"total_amount":4640}', '192.168.1.30', '2026-03-28 10:30:00'),
(3, 'create', 'sale_transaction', 3, NULL, '{"customer_id":3,"total_amount":17516}', '192.168.1.31', '2026-03-29 08:00:00'),
(5, 'update', 'outbound_delivery', 1, '{"status":"scheduled"}', '{"status":"delivered"}', '192.168.1.40', '2026-03-28 15:30:00'),
(5, 'update', 'outbound_delivery', 2, '{"status":"scheduled"}', '{"status":"delivered"}', '192.168.1.40', '2026-03-29 12:00:00'),
(4, 'create', 'purchase_order', 3, NULL, '{"supplier_id":6,"total_amount":44000,"status":"pending_approval"}', '192.168.1.20', '2026-03-30 11:00:00');

SET FOREIGN_KEY_CHECKS = 1;
