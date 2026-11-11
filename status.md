# Current status

Updated: 11 November 2026. The user's follow-up authorized implementation and end-to-end testing.

## Demo ready

Run `pnpm demo` and open http://localhost:3000/sign-in. The server is currently running. The owner, buyer and admin accounts use `CampusTrade-Demo-2026!`; exact emails and the five-minute walkthrough are in demo.md. Three named `Demo:` fixtures include a sale, donation and pending calculator report. The launcher restores these fixtures and demo account access without deleting separately created listings.

Targeted browser check passed for all three logins, the three listings, sale/donation display, buyer-to-owner contact and the pending admin queue. Evidence: tests/evidence/demo-ready.json. The application code is unchanged from the prior full validation; this follow-up adds the local launcher, fixtures and instructions.

## Local outcome

The existing CampusTrade application is implemented and verified locally. Corrected server access/ownership/active checks, verification proof handling, private contact coordination and retries, atomic moderation/session revocation/audit, stable filters/pagination, modal focus and responsive card sizing. The system remains a single-college marketplace with one student role for buying/selling/donating; payments, escrow, delivery and handover remain outside the system.

No Git repository was initialized. Existing unrelated files and .env were preserved. Local synthetic databases and test services were used; no external service was created or deployed.

## Actual evidence

- 52 unit tests passed, 24 real PostgreSQL integration tests passed, and eight production-browser journeys passed across Chromium/Firefox. Lint/typecheck and optimized builds pass.
- Clean-copy frozen install, generation, three migrations, seed, route types, build, and browser login/browse after reload pass.
- Ten distinct authenticated accounts; 1007 users / 1007 credentials / 5005 listings; 600.98s; 5459 rendered searches; zero failures/over-five-second samples. p95 130.10ms, maximum 741.12ms. This is local diagnostic evidence under the proposed workload, not formal campus acceptance.
- Complete-data backup/restore digests, visibility, browser access, historical contacts and new contact persistence pass. The health recorder's 15 local probes passed; NFR-3 remains NOT MEASURED.
- Four grayscale SVG frames and a clickable local prototype are delivered and browser-checked. Native Figma import/review remains pending.

Read [validation.md](validation.md) for actual commands, raw evidence links, FR/NFR/source-case traceability and limitations. Source/test fingerprints are in tests/evidence/source-sha256.txt. Raw reports live under tests/evidence/ and browser screenshots/report under test-results/ and playwright-report/.

## Exact next steps

No further local feature implementation is needed for this handoff. Resolve the external dependencies in decisions.md: real domain/mail configuration and disclosure/moderation/retention policies; native Figma delivery; agreed normal workload/target; hosting and approved uptime window; human alpha/beta/UAT and signatures. Then configure authorized staging and execute external acceptance. T03/T11/T12/T13 remain externally blocked as detailed in tasks.md; never convert these to fabricated passes.

Existing app on localhost:3000 returned health 200, sign-in 200 and anonymous catalogue 401 during the final smoke. Test-only listeners are stopped after runs; PostgreSQL and synthetic evidence databases remain available locally. No production availability or external email delivery is claimed.

## Demo preflight rerun — 11 November 2026, 19:02 IST

`pnpm demo` restored synthetic fixtures and confirmed the existing localhost:3000 server. Fresh `pnpm test:unit` passed 52/52, `pnpm test:int` passed 24/24 against the separate PostgreSQL test database, and `pnpm test:e2e` passed 8/8 across Chromium and Firefox (37.7s), including its optimized production build. Local health returned `{"status":"ok","database":"up"}`. These reruns do not remeasure capacity, real campus delivery or availability acceptance.

A 121-second silent UI walkthrough was recorded successfully and converted to artifacts/demo/campustrade-demo.mp4 (1440×900); recording assertions passed for owner edit, donation, buyer contact, owner inbox, admin removal and buyer search visibility. Preview frame inspected. Demo fixtures were restored afterward with `pnpm demo --prepare-only`, ready for another presentation.

The single MP4 was replaced with a slower 121-second recording featuring a visible pointer, click highlights and donation availability toggles. Recording assertions passed; demo fixtures restored afterward. Intermediate WebM files removed, leaving one video.
