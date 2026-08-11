-- Migration 0048: Rename vendor_id -> partner_id in inventory and inventory_history tables

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'vendor_id') THEN
    ALTER TABLE inventory RENAME COLUMN vendor_id TO partner_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_history' AND column_name = 'vendor_id') THEN
    ALTER TABLE inventory_history RENAME COLUMN vendor_id TO partner_id;
  END IF;
END $$;
