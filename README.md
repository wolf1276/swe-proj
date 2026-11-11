# CampusTrade

A single-college web marketplace for Team SyncTrade (P8), IEM Kolkata, PCCCS594. One verified student account can buy, sell and donate. CampusTrade records interest and participant contact details; payment, delivery and physical exchange happen independently.

The application uses the existing pinned Next.js/React, Better Auth, Prisma and PostgreSQL stack. See [status.md](status.md) for actual verification and remaining external acceptance. The original PDF requirements and conflicts remain in [sources.md](sources.md).

## Run the demo

```sh
pnpm demo
```

Open **http://localhost:3000/sign-in**. Password: **CampusTrade-Demo-2026!**

| Demo role | Email |
| --- | --- |
| Owner: post/edit items | a.student@campus.example |
| Buyer: contact/report | b.student@campus.example |
| Admin: review reports/manage users | admin@campus.example |

Search for `Demo:` to see the prepared sale, donation and reported calculator. Use separate normal/incognito windows for different accounts. [Five-minute walkthrough](demo.md).

The launcher starts PostgreSQL, applies migrations, restores the named synthetic demo fixtures and starts/reuses the local server. Rerun it before another presentation to restore those fixtures. It leaves other listings intact. Dependencies must already be installed; for a fresh machine use the setup below.

## Local setup

Use Node.js 22 LTS (>=22.13; `.nvmrc` pins the tested version), pnpm, OpenSSL and Docker Compose. The tested environment uses Node 22.22.3, pnpm 11.20.0 and PostgreSQL 16.

1. Copy `.env.example` to `.env`. Keep its reserved `campus.example` domain for synthetic local use. Generate an auth secret with `openssl rand -base64 32` and set `BETTER_AUTH_SECRET`. Never use the example password or domains for real student data.
2. Run `pnpm install --frozen-lockfile`, then `pnpm db:generate`.
3. Run `pnpm db:up`, `pnpm db:deploy`, then `pnpm seed`.
4. Run `pnpm dev` and open `http://localhost:3000`.

Local seed accounts: `a.student@campus.example`, `b.student@campus.example`, `admin@campus.example`, `operator@staff.example` (admin without student eligibility), `unverified@campus.example`, `outside@gmail.example`, `suspended@campus.example`. The password comes from `DEV_SEED_PASSWORD` (the template's synthetic local default is documented there). A seeded verified account demonstrates access, not the mailbox verification journey.

To exercise verification, register a new `@campus.example` account and open its link in `/dev/mailbox`. The mail sink captures actual provider links; it does not bypass verification. It is unavailable in production.

Operator admin provisioning: set `ADMIN_EMAIL`, `ADMIN_PASSWORD` and optionally `ADMIN_NAME`, then run `pnpm admin:create`. There is no public admin signup.

## Validation

```sh
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:int
pnpm exec playwright install chromium firefox
pnpm test:e2e
pnpm build
pnpm perf:run
pnpm recovery:check
```

Integration tests require `TEST_DATABASE_URL` pointing at the separate local `campustrade_test` database. Create that empty database using your local PostgreSQL operator tooling first. The tests migrate it and clean only their own fixtures. Test safeguards reject application databases and remote targets.

The browser runner creates/migrates/seeds `campustrade_e2e` through the local PostgreSQL connection, builds/starts the production application behind local HTTPS on port 3100 (internal port 3101), and captures SMTP locally on port 2526. It generates a temporary local certificate using OpenSSL. No real email is sent. The test reads captured mail from disk; the app's development mailbox must return 404 in this production run. Run browser tests and the benchmark sequentially for reproducible measurements; their production builds have separate output directories. Keep those ports free. The benchmark similarly prepares `campustrade_perf`, starts local HTTPS on port 3200 (internal 3201, local SMTP 2527) and measures ten authenticated browser sessions for ten minutes against at least 1,000 users and 5,000 listings. It reports failures and every result exceeding five seconds. Short diagnostic runs may set `PERF_DURATION_SECONDS`; they do not satisfy the proposed ten-minute profile.

Browser HTML report: `pnpm exec playwright show-report`. Raw results live in `tests/evidence/`; screenshots/traces live in `test-results/`. Do not publish local mail or traces containing tokens. A production build alone does not establish browser, email, load or availability acceptance.

Production startup requires explicit HTTPS `APP_URL`, an approved domain allowlist, a generated auth secret and SMTP URL/sender. Real domains, sender delivery, deployment, the availability window and human UAT remain configuration/acceptance work. See [operations.md](operations.md).

## Handoff

Read [AGENTS.md](AGENTS.md), [sources.md](sources.md), [idea.md](idea.md), [goal.md](goal.md), [requirements.md](requirements.md), [decisions.md](decisions.md), and [status.md](status.md). Follow [loop.md](loop.md) and [tasks.md](tasks.md).

| Document | Purpose |
| --- | --- |
| [design.md](design.md) | Screens, flows and accessibility |
| [architecture.md](architecture.md) | Modules and runtime boundaries |
| [data-model.md](data-model.md) | Persistence and lifecycle rules |
| [api.md](api.md) | API contracts and authorization |
| [security.md](security.md) | Verification, access and privacy |
| [testing.md](testing.md) | Source cases, evidence and acceptance |
| [validation.md](validation.md) | Actual run summary and requirement traceability |
| [docs/academic-artifacts.md](docs/academic-artifacts.md) | Grayscale frames and clickable local prototype |
| [operations.md](operations.md) | Setup, deployment and recovery |
| [demo.md](demo.md) | Demonstration and academic deliverables |
