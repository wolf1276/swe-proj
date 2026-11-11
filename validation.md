# CampusTrade local validation — 11 November 2026

Local implementation and automated verification are complete. Formal institutional/product acceptance remains pending for the external items below. No Git repository exists; reproducible source hashes are stored in tests/evidence/source-sha256.txt rather than an invented revision.

## Actual results

| Check | Actual outcome | Evidence |
| --- | --- | --- |
| Frozen install, generation, migrations, seed, route types, lint/type checks and optimized build | PASS in a clean temporary source copy with no initial node_modules and a newly created empty synthetic database; current-source recheck also passed | [bootstrap record](tests/evidence/bootstrap.json) |
| Unit | 52 passed; 0 failed | [unit results](tests/evidence/unit-results.json) |
| PostgreSQL integration | 24 passed; 0 failed | [integration results](tests/evidence/integration-results.json) |
| Production browser journeys | 8 passed; 0 failed across Chromium and Firefox | [browser results](tests/evidence/e2e-results.json), playwright-report/index.html |
| Lint / typecheck | PASS using actual repository commands | Recorded successful execution in this run |
| Capacity/displayed search | 5459 samples; 0 failures; 0 over five seconds | [complete measurements](tests/evidence/performance.json) |
| Local recovery | Complete-row data digests/counts match after pg_dump/pg_restore; recovered login, browse, removed-content denial, historical contact and new contact all pass | [recovery record](tests/evidence/recovery.json) |
| Local health recorder | 15 probes; 0 failed; no formal availability claim | [probe record](tests/evidence/monitor.json) |
| Academic local visuals | Four grayscale SVGs rendered and clickable contact/report/review flow passed | [visual handoff](docs/academic-artifacts.md), [prototype record](tests/evidence/prototype.json) |
| Existing local app | /api/health 200, /sign-in 200, anonymous /api/listings 401 on port 3000 | Live HTTP smoke performed during this run |

Browser tests use the optimized production application behind local HTTPS and an actual local SMTP protocol capture. The app's development mailbox returns 404. Test clients alone accept the temporary self-signed certificate. All users, messages and recipients are synthetic; no external mail was sent. Screenshots are under test-results/; success traces do not need to retain tokens. Do not publish local mail directories or private test traces.

## Capacity profile and limits

Measured from 2026-11-10T19:31:40.166Z to 2026-11-10T19:41:41.552Z (UTC), lasting 600.98 seconds. Dataset: 1007 users, 1007 credential records and 5005 listings. Ten separate registered accounts each have an authenticated browser context. Five scenarios cover browse, text, condition/offer filters, price bounds and a deep page. Routes are warmed; each session uses a one-second think time.

Timing runs from browser navigation initiation to a usable rendered result count and first listing. p50 95.54 ms; p95 130.10 ms; maximum 741.12 ms. Every successful sample meets the inclusive 5,000 ms limit; no percentile exception is used. The final report was independently audited for duration, dataset sizes, ten session IDs and every individual sample.

Environment: Node v22.22.3, Chromium 158.0.8127.18, 12th Gen Intel(R) Core(TM) i5-12450H, 12 logical CPUs, approximately 15 GiB RAM, Linux; application, TLS proxy, database and browser share the same machine. Other local verification ran during portions of this diagnostic. This is neither 1,000 concurrent users nor approved campus normal-load acceptance. D09 remains open; NFR-3 is not measured over an approved operating window.

An earlier same-account diagnostic is retained as performance-initial.json for provenance. The final performance.json supersedes it with credential-backed identities and distinct accounts. Interrupted development/fixture-adjustment attempts are not represented as completed capacity runs.

## Requirement and source-case traceability

| Requirement | Authoritative local evidence | External acceptance still required |
| --- | --- | --- |
| FR-1 | Real signup -> local SMTP link -> atomic single-use proof -> provider verification/session; rejected domain, unverified, expired/replayed and forged-field checks. TC-I01, TC-S01/S02 | Approved institutional allowlist and real sender/mailbox delivery |
| FR-2 | Sale/donation persistence and interest; one student identity creates both offer types and contacts another owner. TC-I02, TC-S03/S06 | Human campus UAT |
| FR-3 | Owner edits/prices/deletion persist; direct cross-owner requests denied; stale writes conflict. TC-I02, TC-S03 | Human UAT |
| FR-4 | All eight authorization combinations / P1-P4; actual operator CLI admin login without student proof; public privilege forgery denied. TC-D01-D04, TC-I01, TC-S02/S08 | Provisioning ownership/policy and institutional approval |
| FR-5 | Durable participant inbox and counterpart email after disclosure; correct recipient; failure/retry/idempotency and historical contacts. TC-I04, TC-S06 | D07 real-user disclosure approval and external mail delivery |
| FR-6 | Text/category/price/condition/availability predicates; inclusive donation zero price; stable multi-page results; browser combined filters and empty recovery. TC-I03, TC-S04, TC-B01-B03 | Vocabulary and normal-load agreement |
| FR-7 | Report persists, duplicate is predictable and listing stays visible before review. TC-I04, TC-S07 | Moderation policy/reviewer assignment |
| FR-8 | Reviewed atomic removal/audit; removed content cannot be read, contacted or republished; suspension revokes existing sessions; concurrent admin protection. TC-I04, TC-S07/S08 | Human moderation/UAT review |
| NFR-1 | Every measured displayed-results sample <=5s under the explicit local diagnostic; BVA classification includes 4.99/5.00/5.01s | D09 approved normal workload and target environment |
| NFR-2 | Server eligibility/verification/active/role/ownership checks, exact domains, protected SSR/API, CSRF and participant privacy negatives pass | Real domain and production environment configuration |
| NFR-3 | Probe recorder works; local recovery exercised | NOT MEASURED: approved operating window, probe/downtime policy and actual full-window data |
| NFR-4 | >=1,000 complete synthetic user/credential records and measured searches under ten distinct concurrent sessions | D09 accepted workload/environment; full TC-S05 remains partial until uptime evidence also exists |

TC-B01-B03 are threshold-classification tests, not manufactured application timings. No code coverage percentage is claimed. Automated WCAG A/AA scans, keyboard modal focus, mobile layout and network/error recovery are useful partial accessibility evidence; manual screen-reader, zoom and human usability review are not certified by these tests.

## Fixed defects and limitations

| Finding | Resolution / evidence |
| --- | --- |
| Stale documentation said no application existed | Reconciled with actual checkout and current handoff |
| Listing SSR routes missed student eligibility; admin guard missed active status | Central server predicates and explicit page gates; real session and browser negatives |
| Generic auth admin endpoints could bypass domain workflows | Expose required auth endpoints only; generic role/ban/delete/impersonation paths return 404 |
| Same-site fetch signal accepted for CSRF | Require exact Origin or same-origin fetch signal; negative tests |
| Proof replay/concurrent use and split verification writes | Expiring hashed receipts consumed atomically; provider flag/student proof written together; real provider integration tested |
| Contact inbox lacked actionable participant coordination | Explicit sharing notice, participant-only email links, notification status and guarded retry |
| Concurrent moderation/status/ownership writes and donation-zero filtering | Row/version/advisory locks, atomic audit/session changes, inclusive zero-price semantics and regression cases |
| Dialog focus and mobile card sizing | Native dialog closed before focus restoration; cards fill grid width; browser and screenshot QA |
| Incomplete test/tooling setup | Integration/browser harnesses, credential-backed capacity fixtures, Node engine range, clean install and recovery checks |

No known open severity-1/2 defect was observed in the tested local scope. ESLint 10 runs successfully, but three upstream plugin peer ranges advertise support only through 9; this is a recorded tooling warning. Vitest emits a future native-config-loader warning; current execution passes. These warnings are not concealed as application test failures or silently suppressed.

## External handoff

T03: import the local SVG/prototype package into the team's native Figma workspace and record actual review/link. T11: agree D09 before formal performance acceptance. T12: authorize/configure staging and SMTP, approve D10 monitoring policy, and collect real uptime evidence. T13: perform team/faculty alpha/beta/UAT and obtain real sign-off. D04-D15 policies/configuration remain as recorded in decisions.md. No deployment, payment system, real-domain guess or human signature was created.
