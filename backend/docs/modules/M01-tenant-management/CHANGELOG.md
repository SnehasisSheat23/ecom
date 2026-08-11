# M01 Tenant Management — Changelog

## [Unreleased]
- Initial PRD, DESIGN, TASKS created
- Bootstrapped the Node.js/TypeScript app foundation for module-first delivery
- Added M01 tenancy schema, types, validators, service, routes, middleware, and shared tenant-prefixed helper libraries
- Added M01 service/helper tests covering domain resolution, slug immutability, activation safeguards, payment redaction, and tenant-prefixed naming
- Added a concrete Drizzle/Postgres tenancy repository, base app error handling, admin-route auth guard, and SQL migration for tenancy tables
- Expanded tests to cover tenant middleware and admin route behavior
- Added encryption helpers for payment credentials/webhook secrets and a migration runner for tenancy bootstrap
- Added a real Postgres-backed integration test covering encrypted payment storage, hostname resolution, and tenant isolation verification
