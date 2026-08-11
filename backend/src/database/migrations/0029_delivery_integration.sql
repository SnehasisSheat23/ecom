-- Migration: Delivery Integration & Tracking
CREATE TABLE "vendor_delivery_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "vendor_id" uuid REFERENCES "vendors"("id") ON DELETE CASCADE,
  "provider" varchar(50) NOT NULL DEFAULT 'manual',
  "credentials" jsonb,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "uq_vendor_delivery_config" UNIQUE("tenant_id", "vendor_id")
);

CREATE TABLE "shipments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "order_id" uuid REFERENCES "orders"("id") ON DELETE CASCADE,
  "sub_order_id" uuid REFERENCES "order_sub_orders"("id") ON DELETE CASCADE,
  "provider" varchar(50) NOT NULL,
  "carrier_id" varchar(150),
  "awb_number" varchar(100),
  "shipping_status" varchar(50) NOT NULL DEFAULT 'PENDING',
  "label_url" varchar(500),
  "invoice_url" varchar(500),
  "tracking_url" varchar(500),
  "sync_enabled" boolean NOT NULL DEFAULT true,
  "raw_response" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "shipment_tracking_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "shipment_id" uuid NOT NULL REFERENCES "shipments"("id") ON DELETE CASCADE,
  "status" varchar(50) NOT NULL,
  "description" varchar(500),
  "location" varchar(255),
  "event_time" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "idx_vendor_delivery_configs_tenant" ON "vendor_delivery_configs" ("tenant_id");
CREATE INDEX "idx_shipments_tenant_order" ON "shipments" ("tenant_id", "order_id");
CREATE INDEX "idx_shipments_tenant_sub_order" ON "shipments" ("tenant_id", "sub_order_id");
CREATE INDEX "idx_shipment_tracking_logs_shipment" ON "shipment_tracking_logs" ("shipment_id", "event_time");
