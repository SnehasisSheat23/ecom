# DESIGN-M10 — Notifications

<!-- TODO: Expand before Phase 2 -->

## File Map
| File | Purpose |
|------|---------|
| `notifications.schema.ts` | `notification_templates`, `notification_logs`, `tenant_notification_config`, `notification_routes` |
| `notifications.service.ts` | `triggerEvent(tenantId, eventType, payload)` — enqueues routes |
| `src/providers/notification/email.interface.ts` | Email provider interface |
| `src/providers/notification/whatsapp.interface.ts` | WhatsApp provider interface |
| `src/providers/notification/resend.provider.ts` | Resend implementation (Email) |
| `src/providers/notification/twilio.provider.ts` | Twilio implementation (WhatsApp) |

## Database Schema (DDL)

```sql
CREATE TYPE notification_channel AS ENUM ('EMAIL', 'WHATSAPP');
CREATE TYPE notification_recipient_type AS ENUM ('CUSTOMER', 'VENDOR', 'ADMIN');

-- Per-tenant provider credentials
CREATE TABLE tenant_notification_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  channel         notification_channel NOT NULL,
  provider        VARCHAR(50) NOT NULL, -- 'RESEND', 'TWILIO', 'META'
  credentials     JSONB NOT NULL,       -- API Key, SID (Encrypted)
  "from"          JSONB NOT NULL,       -- { name, email/phone }
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tenant_channel UNIQUE (tenant_id, channel)
);

-- Mapping events to recipients and channels
CREATE TABLE notification_routes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  event_type      VARCHAR(100) NOT NULL,
  recipient_type  notification_recipient_type NOT NULL,
  channel         notification_channel NOT NULL,
  template_id     UUID NOT NULL REFERENCES notification_templates(id),
  is_active       BOOLEAN DEFAULT true
);

CREATE TABLE notification_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  name            VARCHAR(100) NOT NULL,
  channel         notification_channel NOT NULL,
  subject         VARCHAR(255), -- NULL for WhatsApp
  body            TEXT NOT NULL,
  variables       JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  event_type      VARCHAR(100),
  recipient_type  notification_recipient_type,
  channel         notification_channel,
  recipient_to    VARCHAR(255) NOT NULL,
  provider_msg_id VARCHAR(255),
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message   TEXT,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Async Jobs

Notifications are processed via **QStash (Serverless HTTP Transport)** to ensure compatibility with Cloudflare Workers. QStash pushes jobs to the engine's internal endpoints.

| Queue | Job Endpoint | Payload |
|-------|--------------|---------|
| `tenant:{tenantId}:notifications` | `POST /internal/jobs/notifications/trigger` | `{ eventType, payload, tenantId }` |
| `tenant:{tenantId}:notifications` | `POST /internal/jobs/notifications/send` | `{ channel, to, templateId, data, tenantId }` |

### Process Flow
1. **Trigger Phase**: An upstream module (e.g., Orders) calls `notifications.triggerEvent()`, which enqueues the `trigger` job via QStash.
2. **Resolution Phase**: The `POST /internal/jobs/notifications/trigger` endpoint is hit by QStash. The service resolves all active `notification_routes` for the event and fetches contact info (M02/M14).
3. **Dispatch Phase**: The trigger job enqueues individual `send` jobs via QStash for each identified route.
4. **Execution Phase**: The `POST /internal/jobs/notifications/send` endpoint is hit. The service:
    - Fetches **Encrypted** `tenant_notification_config`.
    - Initializes the Provider (Resend/Twilio) via the shared interface.
    - Renders the template and sends the message.
    - Updates `notification_logs` with the result.
