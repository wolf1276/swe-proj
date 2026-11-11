# Goal and completion contract

## Current setup goal

Create a coherent Markdown handoff from the four PDFs so an implementation agent can continue without guessing the core scope. This setup is complete when source mapping, requirements, design, technical proposals, tasks, execution loop, test coverage and open decisions exist and their links are valid. It does not include implementation.

## Future product goal

Deliver CampusTrade as a working campus-only web application satisfying FR-1 through FR-8 and NFR-1 through NFR-4, with repeatable student/admin demonstrations and recorded validation evidence.

| Milestone | Exit condition |
| --- | --- |
| M1 Requirements/planning | Baseline traced; open decisions have owners or explicit provisional defaults |
| M2 System design | Screens, modules, data contracts and role rules agreed; academic wireframe/prototype artifacts tracked |
| M3 Core development | Verified access, roles, listings and search work with real persistence |
| M4 Integration/testing | Contact/report/admin flows integrated; functional/security regressions pass; NFR evidence or unresolved acceptance recorded |
| M5 Finalization | Runbook, demo, test summary and outstanding limitations delivered; authorized human acceptance recorded |

No submission dates are invented; align dates with the actual academic schedule.

## Definition of done for the product

- All six charter criteria in S1 p. 1 demonstrated: eligible access, sale/donation listing management, four filter dimensions, contact, administration, repeatable principal workflows.
- All eight functional requirements covered with persistent integrated behavior and negative access tests.
- Approved-domain and successful mailbox verification gate marketplace access; admins and listing owners have the correct boundaries.
- Removed/deleted content is absent from active results; unavailable content is represented consistently; contact never implies a completed payment.
- Search displayed within 5 seconds under the agreed normal load; at least 1,000 registered users represented in capacity testing, not misreported as 1,000 concurrent users.
- 99% availability assessed using the approved operating period and monitoring method. If the window has not elapsed or is unapproved, report pending, not passed.
- Meaningful unit, real-database integration and browser system tests pass; no open severity-1/2 defects at system exit.
- Fresh local setup, migrations and seed steps verified; secrets absent; production verification bypass impossible.
- Required wireframes/prototype, documentation and actual test evidence delivered. Human sign-off or explicitly accepted exceptions remain human decisions.

Use separate statuses: implemented, verified, pending external configuration, not measured, accepted exception. Never collapse them into a blanket complete claim.

## Authorized local implementation goal — 11 November 2026

The user's follow-up authorized completing the existing application and testing everything end to end. Evaluate this local implementation goal using current source, real-database tests, production-browser journeys, clean setup/recovery and diagnostic capacity evidence. External requirements must be recorded separately rather than fabricated. The future-product definition of done above remains unchanged: unapproved campus configuration, native Figma delivery, real delivery/workload/uptime and human acceptance cannot be declared passed from local evidence.
