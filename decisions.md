# Decisions and open questions

Status meanings: source baseline is documented in the PDFs; proposed default can guide reversible local work; unresolved needs a human/environment fact before dependent acceptance. No proposed choice is a claimed team/faculty approval.

| ID | Topic | Status / direction | When needed |
| --- | --- | --- | --- |
| D01 | System boundary | Source baseline: no payments, escrow, delivery, supervised exchange or dispute settlement | Always |
| D02 | Student roles | Source baseline: one student account buys/sells/donates; admin privilege separate | Always |
| D03 | Technical stack | Proposed: TypeScript React/Next.js modular app, PostgreSQL, maintained auth integration | Confirm compatibility and versions at bootstrap |
| D04 | Campus domains | Unresolved: obtain exact allowlist from institution/project owner; never guess from IEM name | Before real student access/UAT |
| D05 | Verification | Proposed: maintained email-link flow with expiring single-use token; local mail sink, real sender in staging | Select provider/configuration before integration acceptance |
| D06 | Item vocabulary | Proposed categories/conditions/availability in data-model.md | Confirm before final state/filter acceptance |
| D07 | Student contact | Proposed: durable in-app interest record/inbox plus owner email notification; participant-only sharing of college email after explicit contact action | Confirm channel and disclosure with project owner before real-user rollout; no realtime chat required |
| D08 | Moderation | Proposed: report queue, recorded review, dismiss/remove with reason; user suspend/reactivate with audit | Agree criteria and responsible admin before UAT |
| D09 | Normal load | Unresolved acceptance profile; proposed local benchmark: 1,000 synthetic registered users, 5,000 listings, 10 concurrent search sessions for 10 minutes | Human agreement before claiming NFR-1/4 accepted |
| D10 | Availability | Unresolved normal operating period/window/probe cadence/downtime policy | Must be agreed before NFR-3 measurement |
| D11 | Admin student rights | Source test-model assumption: admin alone cannot use student-only functions; dual eligibility may allow both | Confirm at access-model review; preserve strict baseline meanwhile |
| D12 | Currency/price | Proposed INR integer minor units; zero-price sale distinct from donation | Confirm before final price validation |
| D13 | Retention/admin provisioning | Unresolved retention period; proposed operator-controlled initial admin and no public elevation | Before production/student data |
| D14 | Hosting and secrets | Unresolved provider, credentials, database/mail access and deployment target | Before staging/deployment |
| D16 | Mobile filters | Local default: visible stacked filters, replacing the initially proposed drawer; preserves keyboard access and avoids hidden filter state | Revisit during human usability review |
| D15 | Academic deliverables | Wireframes and clickable Figma flow absent from PDFs; planned in design.md | Before claiming M2/M5 academic completion |

## Handling uncertainty

Proceed with synthetic local fixtures and reversible proposed defaults when implementation is authorized. Do not block unrelated work on hosting credentials or a future uptime window. Ask for the minimum missing facts when dependent work is reached. Missing real domains prevents real eligibility acceptance, not schema design. An unagreed availability window cannot be replaced by a short successful smoke check.

Record future decisions as: ID/date, question, selected option, source or decision maker, rationale, affected files/requirements/tests, status. Preserve prior rationale when a decision changes. Do not fabricate approvals or exact deadlines.

## Local implementation decisions — 11 November 2026

These are reversible implementation choices adopted under the user's explicit implementation request, not institutional approval.

- D03: retain existing pinned Next.js 16.4.5, React 19.3.1, Prisma 7.10.1, Better Auth 1.7.18, PostgreSQL 16 and pnpm lockfile. Consulted official Next.js Playwright and Better Auth email docs; used the installed Prisma 7 CLI/config rather than following current Prisma 8 commands. No version upgrade is required for this scope.
- D04/D05: local `campus.example` is synthetic only. Verification uses the real provider token flow and a filesystem mail adapter. Production requires explicit HTTPS origin, domain allowlist, secret and SMTP sender/configuration; local mail is refused. Hashed expiring receipts enforce atomic proof consumption before the provider verifies its signature/account binding; expired/replayed receipts are rejected.
- D06/D12: retain existing enums and INR minor units; donation price is stored as NULL, serialized as free, and treated as zero in price filters. This replaces the planning zero-storage proposal while preserving sale/donation distinction. Zero-price sale is still a sale.
- D07: use a durable participant inbox with explicit email-sharing disclosure before contact; only participants receive the counterpart email after contact. Notifications are best effort; `sent` means accepted by the adapter, not proven recipient delivery. Real-user disclosure approval remains pending.
- D08/D11/D13: separate admin authorization from student eligibility. Expose only required authentication endpoints; generic provider admin mutations are blocked. Account status, session revocation and audit commit atomically under a database lock; no public admin signup.
- D09: run the proposed synthetic local profile (at least 1,000 users, 5,000 listings, 10 browser sessions for 10 minutes) as diagnostic evidence. The normal campus workload is still unapproved, so a passing local measurement does not constitute formal NFR acceptance.

References: [Better Auth email](https://better-auth.com/docs/concepts/email), [Next.js Playwright](https://nextjs.org/docs/app/guides/testing/playwright), installed `prisma migrate --help` and `prisma7.config.ts` for Prisma 7 compatibility.

- D05/D11 hardening: `emailVerifiedAt` records actual student mailbox proof and is required alongside the provider verification flag. New operator-provisioned admins receive admin login without a student proof timestamp. Promoting an already verified student retains their existing proof; administrator creation alone cannot grant marketplace eligibility.
- Browser validation uses optimized production builds, local HTTPS proxies and reserved-recipient-only SMTP capture. Chromium and Firefox are tested; local self-signed certificates are trusted only by the test clients. The production mail sink stays disabled. This supersedes the initial development-server test harness.
- Retained ESLint 10.14.0 after checking dependency peers: three upstream plugin peer ranges still advertise support only through ESLint 9. Downgrading selected an unsupported/deprecated ESLint 9 release, so it was reverted. Actual lint execution remains the validation; the peer-range warning is recorded as a tooling limitation.

## D17 — Local presentation launcher

The user requested a demo-ready local experience. `pnpm demo` uses only loopback app/database addresses, the reserved campus.example allowlist and the development mail sink. It sets the explicitly synthetic demo password for child seed execution, restores only the three named demo listings/report, and reuses or starts the local server. It does not bypass authentication or mailbox proof for newly registered accounts. Institutional configuration and native Figma/UAT remain separate from this local presentation.
