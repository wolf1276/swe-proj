# Implementation backlog

Implementation was explicitly authorized on 11 November 2026. Local implementation and verification are now recorded below; external acceptance is not implied by a DONE local task. Follow loop.md and update task state/evidence rather than marking a milestone done from a screenshot.

| ID | Milestone | Task / scope | Dependencies | Exit evidence | State |
| --- | --- | --- | --- | --- | --- |
| T01 | M1 | Inspect environment, adopt/adjust stack; review D03-D15; specify configuration and synthetic data | Implementation authorization | Recorded choices; unresolved facts separated from local defaults | DONE |
| T02 | M2 | Bootstrap reproducible app, database/migrations, environment validation, scripts and mail sink | T01 | Fresh install/start and DB connectivity verified; README commands real | DONE |
| T03 | M2 | Build grayscale wireframes and clickable prototype using design.md; align diagrams with scope | T01 | Actual artifact links and flow review; absence reported until produced | BLOCKED |
| T04 | M3 | Implement access/verification, sessions, role guards, suspension and operator admin provisioning | T02 | FR-1/4, NFR-2 negative tests; configured verification integration, no production bypass | DONE |
| T05 | M3 | Implement categories and listing validation/schema; owner create/edit/delete and lifecycle UI | T04 | FR-2/3 persistence, donation/sale and cross-owner cases; TC-I02/TC-S03 | DONE |
| T06 | M3 | Implement browse/detail/search/filter/pagination with protected queries | T05 | FR-6 matching/combined filters, removed visibility, timing instrumentation; TC-I03/TC-S04 | DONE |
| T07 | M4 | Implement durable contact, participant inbox and notification adapter | T05, D07 resolved for real users | FR-2/5; TC-I04/TC-S06; correct recipient, privacy, retry and failure evidence | DONE |
| T08 | M4 | Implement reports, admin review, atomic removal and audit | T05 | FR-7/8; report persists, reviewed removal hidden from discovery/contact; TC-S07 | DONE |
| T09 | M4 | Implement admin user management and session revocation effects | T04 | FR-8; TC-S08, suspension/privilege boundaries and last-admin protection | DONE |
| T10 | M4 | Complete integration/browser regression and accessibility checks | T06-T09 | TC-I01-I04 and TC-S01-S04/S06-S08 actual results; no severity-1/2 issues | DONE |
| T11 | M4 | Run defined search/capacity measurements | T06, agreed D09 | Local diagnostic passed; formal normal-load acceptance awaits D09 | BLOCKED |
| T12 | M4 | Configure staging readiness, monitoring/recovery and measure uptime | T10, D10/D14 resolved, deployment authorized | Real operating window evidence; NFR-3 result or explicit pending window | BLOCKED |
| T13 | M5 | Final docs, demo, defect/test summary, alpha/beta/UAT and human sign-off | T03, T10-T12 | goal.md criteria evidenced or human-accepted exceptions; no invented approvals | BLOCKED |
| T14 | M5 | Make the local presentation ready: one-command launcher, named fixtures and concise walkthrough | T04-T09 | Three logins, sale/donation, contact and pending admin review browser-verified; tests/evidence/demo-ready.json | DONE |

T03 can proceed alongside technical development without requiring parallel agents. T07/T08 can proceed after listing persistence; final integrated validation waits for both. Unavailable external credentials do not prevent local test adapters, but must not be hidden as real integrations.

## Task record template

- ID / state / date:
- Requirement IDs and decision dependencies:
- Changes and paths:
- Validation command/steps, environment, actual outcome and evidence:
- Open defects or external blockers:
- Next ready task:

Keep current task progress in status.md; preserve detailed test runs and defects under the future tests/evidence directory described in testing.md.

## Implementation run — 11 November 2026

- T01/T02: inspected the existing non-Git checkout and installed stack; recorded local defaults. Verified a clean temporary source copy with no node_modules, a new empty synthetic database, frozen install, client generation, all migrations, seed, route generation, lint/type checks, production build and browser sign-in/browse after reload. Evidence: tests/evidence/bootstrap.json.
- T03: four grayscale SVG frames and a clickable local flow delivered and browser-tested under docs/. Native Figma import/link and authorized review remain blocked on the team's external workspace. See docs/academic-artifacts.md.
- T04-T09: local student/admin flows, persistence, ownership, email proof, participant coordination, reports, atomic review, audit and session revocation implemented. PostgreSQL integration and production-browser evidence cover positive/negative paths. D04/D05/D07/D08/D13 real-user approvals remain external rollout dependencies.
- T10: 52 unit cases, 24 PostgreSQL integration cases and eight production-browser journeys across Chromium/Firefox passed, including mobile layout, keyboard focus and automated accessibility scan. No application coverage percentage or human usability approval is claimed.
- T11: final local diagnostic passed: 5459 displayed-results samples over 600.98s, ten distinct accounts, 1007 users/credentials and 5005 listings, zero failed/slow samples. Formal acceptance remains blocked on agreed D09. See validation.md and tests/evidence/performance.json.
- T12: local health recording and synthetic backup/restore smoke passed. Staging hosting/configuration and the approved availability period remain external blockers. Do not mark NFR-3 passed.
- T13: README/runbook, demo, traceability and local visual handoff updated. Native Figma, institutional configuration, alpha/beta/UAT and human signatures remain outstanding.

Next external actions: obtain the missing decisions in decisions.md, import/review the visual artifacts, authorize/configure staging, then rerun external email, workload and availability acceptance. Do not repeat completed local implementation while waiting for those facts.

### Demo preflight follow-up — 11 November 2026

- DONE: start/reuse local demo, restore synthetic fixtures and rerun unit (52), integration (24), production-browser (8 across Chromium/Firefox) checks; all passed. See status.md for evidence and external acceptance limits.
