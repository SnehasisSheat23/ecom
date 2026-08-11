ALTER TABLE payment_events
  DROP CONSTRAINT IF EXISTS uq_payment_events_provider_event_id;

ALTER TABLE payment_events
  DROP CONSTRAINT IF EXISTS uq_payment_events_tenant_provider_event_id;

DROP INDEX IF EXISTS uq_payment_events_provider_event_id;

ALTER TABLE payment_events
  ADD CONSTRAINT uq_payment_events_tenant_provider_event_id UNIQUE (tenant_id, provider_event_id);
