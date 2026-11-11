# Verification plan

Baseline: S4, plan TP-CT-Marketplace-01. Application testing is now executed locally. See the current run record appended below and status.md. Source test examples alone remain planning, not evidence.

## Levels and sequence

1. Unit: domain parsing, verification predicates, role decisions, ownership, price/offer validation, filter semantics, report transitions and contact idempotency. Exercise meaningful positive/negative branches.
2. Integration: incremental top-down, access first, then D1/D2 persistence/listings, discovery, D3 contacts/reports and moderation. Begin with mail/verification adapters as test doubles; replace them with configured integrations for final integration acceptance. Use a real isolated test database for persistence evidence.
3. System: integrated staging/browser flows with seeded accounts; test server permissions as well as visible controls.
4. Acceptance: team/faculty alpha, then limited eligible-student/admin beta/UAT, with actual feedback and human sign-off or accepted exceptions.

The implementation pins Vitest for unit/integration checks and Playwright for production-browser journeys and displayed-results measurements. Test dependencies/configuration are installed; current official documentation and installed provider/CLI behavior were checked during implementation.

## Preserve source cases

| Test ID | Planned check |
| --- | --- |
| TC-B01 | 4.99s search measurement satisfies <=5s threshold |
| TC-B02 | 5.00s satisfies threshold |
| TC-B03 | 5.01s fails threshold and records performance defect |
| TC-D01 | Verified student, non-admin action, no admin grant: allow |
| TC-D02 | Verified student, admin action, no admin grant: deny |
| TC-D03 | Unverified student, non-admin action, no admin grant: deny |
| TC-D04 | No student verification, admin action, authorized admin: allow |
| TC-I01 | Access gate with eligible/ineligible/unverified states and student admin attempt |
| TC-I02 | Configured verification plus D1/D2 listing persistence; owner and non-owner changes |
| TC-I03 | Search/filter matches current database contents |
| TC-I04 | Durable contact/report routing; admin removal; no payment processed |
| TC-S01 | Eligible email registration -> actual configured verification -> sign in |
| TC-S02 | Unapproved/unverified denial and student/admin boundary |
| TC-S03 | Sale/donation create/edit/delete and cross-owner denial |
| TC-S04 | Text search and four filter dimensions; displayed-results time under normal load |
| TC-S05 | >=1,000 registered users, normal-load search target and 99% availability over agreed period |
| TC-S06 | Initiate contact; retained record; exchange stays external |
| TC-S07 | Report -> authorized review -> removal; no active removed content |
| TC-S08 | Supported admin user operation; same action denied for student |

BVA values above validate threshold classification. Do not manufacture those elapsed times as application measurements or use artificial sleeps to claim performance. Actual performance evidence requires measured search behavior.

## Full authorization decision table (S4 p. 4)

Suspension is an additional deny condition applied before this table.

| Rule | Verified eligible student | Admin-only action | Authorized admin | Expected |
| --- | --- | --- | --- | --- |
| R1 | Yes | No | No | Allow |
| R2 | Yes | No | Yes | Allow |
| R3 | Yes | Yes | No | Deny |
| R4 | Yes | Yes | Yes | Allow |
| R5 | No | No | No | Deny |
| R6 | No | No | Yes | Deny |
| R7 | No | Yes | No | Deny |
| R8 | No | Yes | Yes | Allow |

Source basis paths P1-P4 respectively cover authorized admin allow, unauthorized admin deny, verified student allow, unverified student deny. The illustrative helper has cyclomatic complexity 4; map the paths to actual implementation before claiming branch/path coverage. Add all eight table combinations and real middleware/session tests; four sample cases alone are not the entire security suite.

## Additional risk coverage

Expired/reused verification proof, domain lookalikes, existing suspended session, forged owner/role, direct unauthorized requests, private contact reads, notification failure/retry, concurrent edit/moderation, removal search/detail/contact consistency, zero/negative/overflow price, donation normalization, invalid ranges, pagination, empty/error/loading states and keyboard navigation. Map added cases to FR/NFR IDs without renumbering source cases.

## Performance and availability

Use D09/D10 and operations.md. Freeze workload, environment and timing method before comparing runs. Record end-to-end displayed-results timings, failures and distribution, not only a server average. At least 1,000 registered users is a dataset/capacity requirement; concurrency is separately agreed. Do not reinterpret the source target as a weaker percentile guarantee. Any latency acceptance tolerance must be explicitly approved.

NFR-3 needs a real approved measurement window, probe/downtime rules and actual data. Until then its result is NOT MEASURED. A smoke check, test fixture or uptime formula alone cannot establish 99% availability.

## Evidence records to create during implementation

Store synthetic, redacted results under tests/evidence/<run-id>/ or the actual agreed equivalent. Record timestamp, revision, environment/browser, dataset counts, workload, case ID/requirement, expected/actual result, pass/fail/not run, logs/screenshots and linked defects. Never store secrets or real student personal data in evidence.

Defect register fields: ID, severity, requirement/case, reproduction, expected/actual, environment, owner, state, fix revision and retest evidence. Summary: counts executed/passed/failed/not run, unresolved defects, limitations, NFR measurements and acceptance status.

## Entry, exit and suspension

Unit entry: implemented buildable function and known rules; exit: relevant cases/critical branches pass, no blocker. Integration entry: unit checks, interfaces and isolated data ready; exit: required module/store exchanges pass without critical interface defect. System entry: integrated staging and seeded roles; exit: FRs/applicable NFRs evidenced with no open severity-1/2 issue. Acceptance entry: reviewed system results and designated users; exit: actual human sign-off or documented accepted exceptions.

Suspend affected testing/release for authentication bypass, unauthorized admin access, cross-owner changes, material data corruption or repeated crash (S4 p. 6). Resume only after deployed fix, successful reproduction-case rerun, recorded cause and related regressions pass. Unaffected independent checks may continue if safe.

## Current implementation verification — 11 November 2026

- `tests/unit/`: validation, eligibility, price conversion, CSRF/body/error behavior, production guard, TC-B01-B03 threshold classification and destructive-test database guards.
- `tests/integration/marketplace.test.ts`: real PostgreSQL; all eight authorization combinations (P1-P4), anonymous/ineligible/unverified/suspended sessions, persistence, ownership, concurrent edits, combined filters, zero-price donations, participant contacts, duplicate/retry behavior, simulated notification failure followed by real local-sink retry, concurrent reports/moderation, session revocation, paginated admin search and concurrent last-admin preservation.
- `tests/e2e/marketplace.spec.ts`: Chromium and Firefox against the optimized production build over local HTTPS. Real registration, local SMTP delivery and proof consumption; invalid/expired/replayed proof; sale/donation create/edit/delete; availability and combined filters; empty recovery; contact emails; report dialog keyboard focus; reviewed removal and denied access; suspension/reactivation; admin/student separation; direct API denials; network failure preserving form input; 390px layout and automated WCAG A/AA scan.
- `scripts/perf-run.ts`: at least 1,000 synthetic users and 5,000 listings; ten authenticated browser contexts for 600 seconds; browser navigation to usable rendered count and first result; warmed routes and one-second think time. Records all failures and every sample above five seconds. No weaker percentile acceptance is substituted.
- `scripts/monitor.ts`: redacted health probe recorder. Its short local diagnostic is not NFR-3 acceptance.

The final command results, report paths and capacity timings are recorded in status.md and the run summary. Local SMTP proves application-to-local-transport integration, not delivery to a real campus mailbox. Automated accessibility scans and the keyboard cases are partial accessibility evidence, not a screen-reader or human usability certification. No branch coverage percentage or faculty acceptance is invented.
