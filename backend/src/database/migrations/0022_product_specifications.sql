DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='specifications') THEN
    ALTER TABLE "products" ADD COLUMN "specifications" jsonb NOT NULL DEFAULT '{}';
  END IF;
END $$;
