# M02 Auth & Customers — Changelog

## [Unreleased]
- Initial PRD, DESIGN, TASKS created
- Added M02 customer/auth schema, repositories, service layer, routes, validators, and auth middleware
- Added password hashing, signed access tokens, hashed refresh tokens, password reset OTP flow, and guest session persistence
- Added M02 unit tests plus Postgres-backed integration coverage for tenant-scoped auth, address defaults, soft-delete login blocking, and M01 admin auth handoff
- Replaced the custom access token implementation with `jose`, added direct Google ID token verification support, and formalized the guest-cart merge contract for future M06 integration
- Expanded integration coverage for refresh/logout revocation, expired access tokens, non-super-admin admin denial, and Google login flow
