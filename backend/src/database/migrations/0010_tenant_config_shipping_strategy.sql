DO $$
BEGIN
  CREATE TYPE shipping_strategy AS ENUM ('flat_rate', 'weight_based', 'vendor_managed', 'carrier_api');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE tenant_config 
ADD COLUMN IF NOT EXISTS shipping_strategy shipping_strategy NOT NULL DEFAULT 'flat_rate';
