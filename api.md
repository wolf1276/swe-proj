# Proposed application contracts

Routes are design contracts for a future implementation. Equivalent server actions are acceptable if they enforce these same rules. The implementation now provides the routes below except that authentication uses the maintained provider endpoints described at the end.

| Method / path | Operation | Server authorization |
| --- | --- | --- |
| POST /api/auth/request-verification | Start/resend verification | Rate-limited; approved-domain policy; generic account responses |
| POST /api/auth/verify | Consume verification proof | Expiring single-use proof; exact account binding |
| POST /api/auth/logout | End session | Authenticated session; safe idempotent logout |
| GET /api/me | Minimal current account/permissions | Authenticated; no other users' private fields |
| GET /api/categories | Active vocabulary | Verified active student |
| GET /api/listings | Search/filter/page | Verified active student |
| POST /api/listings | Create listing | Verified active student; owner from session |
| GET /api/listings/:id | Read visible item | Verified active student; separate admin review access |
| PATCH /api/listings/:id | Edit details/availability | Verified active owner; version match |
| DELETE /api/listings/:id | Delete own listing | Verified active owner; preserve referenced history |
| GET /api/my-listings | Own listing management | Verified active student; include own status metadata |
| POST /api/listings/:id/contacts | Express interest | Verified active non-owner; listing visible and available |
| GET /api/contacts | Participant contacts | Verified active student; scope to current participant |
| POST /api/listings/:id/reports | Report content | Verified active student; validate target/reason |
| GET /api/admin/reports | Review queue | Active authorized admin |
| POST /api/admin/reports/:id/resolve | Dismiss or remove listing | Active authorized admin; pending report; reason and audit |
| GET /api/admin/users | User management list | Active authorized admin; minimum fields |
| PATCH /api/admin/users/:id/status | Suspend/reactivate | Active authorized admin; reason/audit; protect last admin |

Sign-in/session establishment must be completed through the selected maintained auth integration. Do not implement homegrown token/cryptography protocols to imitate this route table. Admin provisioning is an operator-only path, not public registration.

## Inputs and responses

Listing creation input: title, description, categoryId, offerType, priceMinor where applicable, currency and condition. New listings start available. Reject attempts to set ownerId, moderation state or privileged fields. Owner updates additionally accept availability and require a version token.

Search input: q, category, minPriceMinor, maxPriceMinor, condition, availability and page/cursor. Reject inverted ranges and invalid enum values; bound query size and page size. Donation handling follows data-model.md. Return items, pagination metadata and applied filters without private seller contact fields.

Contact input: optional bounded message and idempotency key. Derive owner/listing metadata on the server. Return a durable contact ID plus notification status, not payment/transaction success. Proposed contact policy requires availability at creation; document any later change.

Report input: reason and optional bounded details. Resolution input: dismiss/remove and reviewReason. Return persisted report state; atomically update visibility when removal is chosen.

## Errors and retries

Use 400/422 for invalid input, 401 for absent/expired session, 403 for known denied actions, 404 for unavailable resources where existence should not leak, 409 for stale writes or resolved reports, and 429 for throttling. Return a safe error code, useful message and field errors; never stack traces or private account data. GET is read-only. Protect cookie-authenticated mutations against CSRF. Make repeated contact submissions safe and report duplicates predictable.

## Implemented authentication surface

`POST /api/sign-up` validates signup inputs and delegates to `/api/auth/sign-up/email` through the provider HTTP handler, preserving its rate limits and safe errors. Provider endpoints exposed under `/api/auth/` are `sign-up/email`, `sign-in/email`, `sign-out`, `get-session`, `verify-email` (GET), and `send-verification-email`. Other endpoints, including generic admin role/ban/delete/impersonation actions, return 404. Verification additionally consumes a hashed expiring single-use receipt; crypto/account validation remains the provider's responsibility.

Contact/report mutations are limited to 20 requests per account/action/minute; notification retries to five. Retries do not create another contact. `sent` means the mail adapter accepted the message; it is not proof of final delivery. Counterpart email appears only in participant-scoped contact responses, never the catalogue.
