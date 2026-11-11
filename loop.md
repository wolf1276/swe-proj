# Agent execution loop

This is a human-readable workflow for a later authorized implementation task, not an installed autonomous runner.

## Begin or resume

1. Read AGENTS.md and status.md. Check the actual working tree and user changes; do not assume Git or an app exists.
2. Read the relevant requirement IDs, open decisions and task dependencies. State the next concrete outcome.
3. Select the first ready task from tasks.md. Resolve only decisions required for that task; continue independent work around external blockers.

## Execute one slice

1. Record task ID, relevant FR/NFR IDs and expected acceptance evidence.
2. Implement the smallest complete behavior across server permissions, persistence and UI as applicable. Keep unrelated refactors out.
3. Exercise the happy path plus invalid/unauthorized paths. Use unit tests for logic, real test-database integration for persistence and browser checks for user flows.
4. Fix failures and run affected regression checks. Do not disable authorization, weaken assertions or swap in mocks to claim integration success.
5. Inspect the diff and output. Run available lint/type/build checks appropriate to the change. Use only commands supported by actual project scripts; record those commands after bootstrap.
6. Update tasks.md, status.md and any changed contracts/decisions. Record evidence path, actual result, blockers and next ready task.

## Status and evidence

Use task states TODO, IN PROGRESS, BLOCKED, DONE. DONE requires the task exit evidence; application availability/UAT may remain pending separately. Record a blocker as the missing fact/dependency, attempted resolution, work still possible and exact next action. Do not repeatedly retry an unchanged external failure.

For each validation record: date, revision/build ID when available, environment, command or manual steps, expected behavior, actual behavior, pass/fail/not run, evidence location and linked defect. Do not record planned output as actual output.

## Stop and hand off

Stop at the authorized boundary, on a destructive/unapproved external action, or when no useful authorized work remains. Surface security blockers immediately. Before ending, leave status.md with the last completed task, exact next step, changed files, validation summary and unresolved external decisions. A later agent must be able to resume from those notes without redoing completed work.
