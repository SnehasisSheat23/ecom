# Support & Claims Module (M18)

This module provides a unified support and complaint system for a multi-tenant, multi-vendor marketplace. It allows customers to raise issues at the order or sub-order level, ensuring that complaints are routed to the correct participant (Vendor or Platform Admin).

## Objectives
- **Granular Support:** Link claims to specific sub-orders or the master order.
- **Role-Based Access:** Vendors see only their relevant tickets; Admins see everything.
- **Communication:** Support for threaded messages within each ticket.
- **Status Tracking:** Clear lifecycle for tickets (Open, In Progress, Resolved).

## Database Schema

### `support_tickets`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `tenantId` | UUID | Tenant isolation |
| `customerId` | UUID | The user who raised the ticket |
| `orderId` | UUID | The master order related to the issue |
| `subOrderId` | UUID (nullable) | The specific vendor sub-order (null for platform issues) |
| `vendorId` | UUID (nullable) | The vendor involved (null for admin/platform) |
| `subject` | String | Brief title of the issue |
| `type` | Enum | `REFUND_REQUEST`, `MISSING_ITEM`, `QUALITY_ISSUE`, `INQUIRY`, `OTHER` |
| `priority` | Enum | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| `status` | Enum | `OPEN`, `IN_PROGRESS`, `PENDING_CUSTOMER`, `RESOLVED`, `CLOSED` |
| `createdAt` | Timestamp | |
| `updatedAt` | Timestamp | |

### `support_messages`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `tenantId` | UUID | Tenant isolation |
| `ticketId` | UUID | Reference to the parent ticket |
| `senderId` | UUID | The customerId of the sender |
| `senderType` | Enum | `CUSTOMER`, `VENDOR`, `ADMIN` |
| `content` | Text | The message body |
| `attachments` | JSONB | List of image/file URLs |
| `createdAt` | Timestamp | |

## Routing Logic

1. **Routing to Vendor:**
   - If a customer selects a specific item or sub-order to complain about, `subOrderId` and `vendorId` are populated.
   - The vendor sees this ticket in their "Support" dashboard.
   - The Admin also sees this ticket for oversight.

2. **Routing to Admin:**
   - If the complaint is about the whole order, checkout process, or a platform-level issue, `subOrderId` and `vendorId` remain `null`.
   - Only the Platform Admin sees and manages these tickets.

## API Endpoints

### Customer API
- `POST /api/support/tickets`: Create a new ticket.
- `GET /api/support/tickets`: List own tickets.
- `GET /api/support/tickets/:id`: Get ticket details and messages.
- `POST /api/support/tickets/:id/messages`: Send a reply.

### Vendor API
- `GET /api/vendor/support/tickets`: List tickets related to their vendorId.
- `GET /api/vendor/support/tickets/:id`: View ticket.
- `POST /api/vendor/support/tickets/:id/messages`: Reply to a ticket.

### Admin API
- `GET /api/admin/support/tickets`: List all tickets across the tenant.
- `PATCH /api/admin/support/tickets/:id/status`: Update ticket status or assign it.
- `POST /api/admin/support/tickets/:id/messages`: Official admin response.

## Implementation Plan

1. **Schema:** Define tables in `Backend/src/modules/support/support.schema.ts`.
2. **Types:** Define interfaces in `Backend/src/modules/support/support.types.ts`.
3. **Repository:** Build database access layer.
4. **Service:** Implement business logic (routing, status transitions).
5. **Routes:** Expose endpoints for all three roles.
