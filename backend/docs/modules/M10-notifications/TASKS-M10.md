# TASKS-M10 — Notifications

## Prerequisites
- [ ] Phase 1 complete

## Tasks
### T01 — Schema: `notification_templates`, `notification_log`
### T02 — NotificationProvider interface + ResendProvider
### T03 — Service: `send()` enqueues async job
### T04 — QStash/worker notification handler
### T04.1 — Define retry/idempotency rules for notification jobs
### T04.2 — Add structured logging for publish failures and handler failures
### T05 — Default HTML templates for all 9 events
### T06 — Wire into M07 (order events), M02 (auth events)
### T07 — Admin route: edit templates per event per tenant
### T08 — Tests: template rendering, DLQ behavior
