# Security and privacy plan

Source priorities: FR-1, FR-3, FR-4, FR-8, NFR-2; S4 access and ownership risks. Controls below are implementation recommendations supporting them.

## Access matrix

| Capability | Unverified / anonymous | Active verified eligible student | Active authorized admin without student eligibility |
| --- | --- | --- | --- |
| Request verification/sign in | Limited access flow | Yes | Configured admin sign in |
| Browse/search/contact/report | No | Yes | No, unless also eligible verified student |
| Create listing | No | Yes | No, unless also eligible verified student |
| Edit/delete listing | No | Own only | No via student route |
| Review/remove reported listing | No | No | Yes via admin review |
| Manage users | No | No | Yes |

Suspension denies protected actions for every role and invalidates existing access. Admin privileges are provisioned separately. S4 p. 4 explicitly treats student and administrator predicates independently; do not make all admins automatically students.

## Verification and sessions

Normalize the email domain safely and match an explicit configured allowlist exactly. Reject suffix lookalikes such as allowed.example.attacker.example. Successful mailbox verification is required in addition to eligibility. Tokens expire, are single use and bind to the intended account. Use a maintained auth integration; secure HttpOnly cookies, appropriate SameSite/secure settings and session rotation/revocation. Never accept role, verification state or owner from client claims without trusted server validation.

No production domain list is known. Fail closed when production configuration is missing. Synthetic development domains and mail sink are isolated from production; test-only shortcuts must never operate there.

## Privacy and abuse

Do not expose a campus directory or public contact emails. Only contact participants can access contact records; administrators access the minimum information necessary for documented moderation. Proposed contact sharing is in decisions.md and remains unconfirmed. Rate-limit verification/resend, login, contact and reporting. Escape displayed user content, validate server-side, parameterize database queries, and avoid unrestricted HTML.

Log request IDs, safe error codes and administrative actions. Do not log verification tokens, session cookies, passwords, raw contact messages or unnecessary student identifiers. Use HTTPS and separate development/test/production data. If images are later added, define content type/size checks and storage permissions before accepting uploads.

## Required negative checks

Unapproved domain; approved but unverified mailbox; expired/replayed proof; forged role/owner; student admin access; another owner's write; direct API access bypassing UI; suspended existing session; cross-participant contact read; removed listing retrieval/search; CSRF mutation; notification duplicate retry; concurrent moderation. A failure in auth, cross-owner writes or material corruption blocks release and follows testing.md suspension criteria.

## Implemented hardening

Student page entry points and APIs enforce all three predicates: active account, mailbox verification, and exact domain eligibility. Admin-only users may review reports/manage users without marketplace access. Removed listings are unavailable through student routes even for dual student/admin users. Generic auth-provider admin routes are not exposed.

Cookie mutations require an exact matching Origin or the `same-origin` fetch signal; `same-site` alone is insufficient. Credential controls remain disabled until client hydration and submit with POST semantics. Contact emails are disclosed only after the explicit sharing action, to participants. Shared database counters protect contact/report/retry endpoints. Status changes revoke sessions and write audit records atomically; report resolution is locked and atomic. Actual test evidence is tracked in testing.md.
