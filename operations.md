# Future setup and operations

Current state: a local Next.js/PostgreSQL application with reproducible scripts, migrations, seed data and executed verification. No Git repository or external deployment exists. README.md contains tested setup commands; real institutional configuration remains pending.

## Local setup contract

- Inspect installed runtimes and choose supported dependency versions from official docs.
- Add a reproducible dependency manifest/lockfile and documented install, development, lint, typecheck, build, unit, integration and browser-test commands.
- Provide database startup/connection instructions, migrations, synthetic seeds and reset instructions restricted to local/test environments.
- Provide an environment template with names/descriptions and safe placeholders, never credentials. Expected concepts: database URL, canonical application URL, session/auth secret, approved campus domain allowlist, mail provider/sender, development mail sink and initial-admin provisioning mechanism.
- Validate configuration at startup. Production must reject missing secrets/domain policy and refuse test mail/verification bypass modes.
- Verify fresh setup using the documented steps before marking bootstrap complete. Update README.md with the real commands.

## Staging and deployment

Use an isolated staging database and synthetic accounts. Configure HTTPS, verification callback URL and real test delivery where authorized. Review migrations, backup/restore and health checks before production. Deploy only within explicit user authorization and available credentials; do not create paid accounts or resources by inference.

Record hosting target, revision, migration version, environment variable names, deployment steps, smoke-test evidence and rollback procedure. Distinguish a deployed build from an actually verified user journey.

## Health, performance and uptime

Provide minimal liveness/readiness checks that reveal no secrets. Monitor application and database failures, search elapsed times and notification failures with safe logs. Define the operating window and probe policy under D10. Availability = successful eligible operating time / total eligible operating time x 100; record actual downtime and measurement gaps. State maintenance rules before measurement. A local uptime percentage is not a production availability claim.

Measure search from user action to rendered usable results; retain server timing as diagnostics. Use the agreed D09 workload and record user/listing counts, concurrent activity, warm/cold state, hardware, run duration, failures and latency distribution. A fast API response alone does not prove the displayed-results target.

## Recovery and data safety

Before destructive migrations, back up and verify recovery on a separate database. Never run test resets on production. Preserve moderation/contact referential integrity and audit events. Roll back code only when compatible with the migrated schema; otherwise use a reviewed forward fix. Recheck access, listing visibility and contact creation after recovery. Define retention with the project owner before using real student data.

## Tested local operations

Use Node 22 LTS >=22.13 (tested 22.22.3, pinned in .nvmrc) and pnpm 11.20.0. The installed Prisma and Vitest engines require a newer Node than Next.js alone; package.json records the combined engine range. PostgreSQL runs through `pnpm db:up`; `pnpm db:deploy` applies the three committed migrations. `pnpm seed` is idempotent for synthetic demo identities/categories/listing titles and refuses production. The capacity seed uses stable synthetic listing IDs and refuses remote or application databases.

`pnpm test:e2e` prepares campustrade_e2e, builds the optimized application, starts local HTTPS 3100 -> internal HTTP 3101 and local SMTP capture 2526. Test-only clients trust the temporary certificate under .test-runtime; no production TLS bypass is configured. SMTP accepts reserved .example recipients only. Production mailbox routes return 404. The runner tears down its local listeners at exit.

`pnpm perf:run` prepares campustrade_perf, uses separate build output and local HTTPS 3200 -> 3201 / SMTP 2527, then records the 600-second diagnostic profile. Prefer running it without other heavy tasks for a reproducible campus-hardware comparison. It must authenticate and find rendered listings; 401 responses, empty samples and latency over five seconds cannot pass.

`pnpm recovery:check` requires the E2E database/build from a successful browser run. It refuses non-synthetic identities, takes a PostgreSQL custom-format snapshot through the local Compose container and restores into a newly generated campustrade_restore_* database without overwriting source data. It compares user/listing/contact/report/audit/visibility counts, then checks anonymous denial, browser sign-in/browse, removed-content denial and new durable contact creation on the recovered app (local HTTPS 3400 -> 3401 / SMTP 2528). The result is a local recovery exercise, not a production recovery-time commitment. Generated synthetic databases can be removed by the operator when their evidence is no longer needed.

Health recording example while a local test service is running:

```sh
MONITOR_URL=https://localhost:3200/api/health MONITOR_LOCAL_CERTIFICATE=1 MONITOR_WINDOW_SECONDS=60 MONITOR_CADENCE_MS=1000 pnpm monitor
```

The certificate exception is limited to localhost by the recorder. Omit it for real TLS. The JSON records individual probes and explicitly does not claim NFR-3. Before formal measurement, record approved dates/hours, probe locations/cadence, incident/downtime attribution, treatment of gaps and maintenance, and responsible human approval. Retain timestamps, raw probes and incident records for the entire approved period.

## External readiness still required

Obtain D04 domain allowlist, D05 verified SMTP sender/delivery, D07 disclosure approval, D08 moderation policy, D09 actual normal workload, D10 availability policy and D13 retention/admin ownership. Configure D14 hosting, HTTPS, secrets and backups in an authorized staging environment. Perform external-email and staging/UAT journeys; no local test can substitute for those facts. Deploying a build does not by itself satisfy them.
