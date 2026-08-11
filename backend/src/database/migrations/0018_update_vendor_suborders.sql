-- 1. Update the order_sub_orders table to allow null vendor_id (for Admin items)
ALTER TABLE order_sub_orders ALTER COLUMN vendor_id DROP NOT NULL;

-- 2. Update the order_sub_order_items table to allow null vendor_id
ALTER TABLE order_sub_order_items ALTER COLUMN vendor_id DROP NOT NULL;

-- 3. If you are using a native PostgreSQL ENUM for vendor_status or similar, 
-- you may need to add the new values. However, based on your schema, 
-- order status is stored as a VARCHAR(20), so no ENUM update is needed for 'CONFIRMED' or 'CANCELLED'.

-- 4. Verify existing status constraints (if any)
-- If you have a CHECK constraint on the status column, you'll need to update it:
ALTER TABLE order_sub_orders DROP CONSTRAINT IF EXISTS order_sub_orders_status_check;
ALTER TABLE order_sub_orders ADD CONSTRAINT order_sub_orders_status_check 
CHECK (status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'));
