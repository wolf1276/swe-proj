# Proposed data model

Derived from S3 class/DFD models and S2 functional requirements. Names, field limits and enums are proposed, configurable defaults. Use UUID-like opaque identifiers and UTC timestamps; enforce relationships and uniqueness in the database.

| Entity | Key fields | Rules |
| --- | --- | --- |
| User | id, normalizedEmail, displayName, emailVerifiedAt, studentEligible, adminGrantedAt, status, createdAt | Email unique; student eligibility depends on approved domain and verification; admin grant is separate and server managed |
| Verification/session | Provider-managed verification and session records | Expiring, single-use verification; no plaintext secrets or raw tokens in logs |
| Category | id, slug, name, active | Listing category must exist; archive instead of breaking historical links |
| Listing | id, ownerId, title, description, categoryId, offerType, priceMinor, currency, condition, availability, moderationState, deletedAt, version, timestamps | Owner fixed from session; sale requires nonnegative price; donation normalized to NULL; removed/deleted never active |
| ContactRequest | id, listingId, requesterId, ownerId, message, idempotencyKey, notificationStatus, createdAt | Owner derived from listing; no self-contact; participants only; no payment fields |
| ListingReport | id, listingId, reporterId, reason, details, state, reviewerId, reviewReason, resolvedAt | Student creates; admin reviews; report submission alone does not remove listing |
| AuditEvent | id, actorId, action, targetType, targetId, reason, createdAt | Append-only record of administrative changes; omit secrets/contact-message bodies |

## Proposed initial vocabulary

Categories: textbooks, lab equipment, stationery, furniture, hostel items, other academic items. Conditions: new, good, fair. Availability: available, unavailable. Offer type: sale, donation. Moderation state: visible, removed. Report state: pending, dismissed, actioned. User status: active, suspended. Final approval tracked in decisions.md; these are not quoted source enums.

Implemented local currency default (D12): INR, represented as integer minor units, never floating point. Reject negative, malformed and overflowing prices. A zero-price sale remains distinct from donation by offer type; change only through an explicit decision. Configure sensible title/description/message limits during bootstrap and test both boundaries.

## State transitions

- Account: unverified -> verified after valid mailbox proof; active <-> suspended via authorized admin. Verification does not clear suspension.
- Listing: available <-> unavailable by owner; visible -> removed through report review by admin; owner deletion sets deletedAt. Removed/deleted listings cannot be republished by ordinary owner edits.
- Report: pending -> dismissed or actioned after admin review. No silent reopening or automatic removal by report count.
- Contact: durable record -> notification sent or failed; retry delivery without duplicating the contact record.

No sold/completed-payment state is required. Unavailable says nothing about whether money changed hands.

## Query and access rules

Campus catalogue requires verified eligible active student access. Combine text/category/inclusive price bounds/condition/availability using AND, excluding deleted/removed content regardless of filters. Proposed default availability filter: available; an explicit unavailable filter can include ordinary unavailable items. Match title/description text with bounded case-insensitive semantics; stable newest-first ordering with ID tie-breaker; paginated results, proposed 20 per page, maximum 100.

Indexes: unique normalized email, listing owner/time, listing category/availability/moderation/time, report state/time, contact participant/time. Validate actual query plans before claiming performance. Retention durations, account deletion and permitted audit visibility remain policy decisions; do not invent a legal retention mandate.

## Implemented storage details

The Prisma schema is authoritative for exact fields. Better Auth stores `emailVerified` plus an informational `emailVerifiedAt`; student eligibility is re-derived from domain, verification and active status. `role` is provider-managed user/admin privilege, not a buyer/seller account type. Donations persist NULL price and match zero-inclusive price filters. Contacts are unique per listing/requester; an idempotency key is retained when supplied. Moderation/deletion increments listing version. Pending report creation and resolution serialize through row locks.

Verification proofs have hashed, expiring receipts in the provider Verification store; atomic deletion enforces single-use while the maintained provider verifies token signatures and account binding. RateLimitBucket stores shared per-account mutation counters with expiry. No raw proof, payment or wallet data is stored in these application tables.
