-- Migration 0047: Rename vendor_id → partner_id across all tables
-- This aligns the DB with the Drizzle schema after the vendor→partner rename

-- products: rename vendor_id → partner_id
ALTER TABLE products RENAME COLUMN vendor_id TO partner_id;

-- media_assets: already has partner_id column (from 0046), drop the old vendor_id
ALTER TABLE media_assets DROP COLUMN IF EXISTS vendor_id;
