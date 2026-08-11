-- Phase 7: Inventory & Stock Alignment - Enforce mandatory vendor_id on inventory tables
TRUNCATE TABLE inventory, inventory_history CASCADE;

ALTER TABLE inventory ALTER COLUMN vendor_id SET NOT NULL;
ALTER TABLE inventory_history ALTER COLUMN vendor_id SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_inventory_vendor'
  ) THEN
    ALTER TABLE inventory 
    ADD CONSTRAINT fk_inventory_vendor 
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;
  END IF;
END $$;
