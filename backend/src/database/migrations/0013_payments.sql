CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  payment_intent_id UUID REFERENCES payment_intents(id),
  provider VARCHAR(30) NOT NULL,
  provider_event_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  payment_id VARCHAR(255),
  amount INTEGER,
  currency VARCHAR(3),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_payment_events_provider_event_id UNIQUE (provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_events_tenant_intent ON payment_events(tenant_id, payment_intent_id);
