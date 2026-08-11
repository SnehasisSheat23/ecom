-- Migration: Rename vendor_id column to partner_id in shipping_methods table
DO $$ 
BEGIN 
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shipping_methods' AND column_name = 'vendor_id'
  ) THEN
    ALTER TABLE "shipping_methods" RENAME COLUMN "vendor_id" TO "partner_id";
  END IF;
END $$;

ALTER INDEX IF EXISTS idx_shipping_methods_vendor RENAME TO idx_shipping_methods_partner;
