# 05 — Issue writeback

Canonical issue written:

- `.ai/issues/open/ISSUE-039-recover-active-goal-continuation-after-compaction.md`

Sections included:

- Title and front matter: status, priority, owner, created date, next best session, target bucket/kind, target repo root, related docs/issues.
- Goal.
- Problem/context with transcript excerpt.
- Desired behavior.
- Transcript artifact links.
- Research findings grounded to live code and Pi docs.
- Locked design choices and rejected alternatives.
- Valid TOON synthesis block.
- Implementation checklist.
- Acceptance criteria.
- Proof threat model.
- Valid TOON `required_proofs[]` block.

Key writeback decisions:

- Status set to `open — execution-ready` because root cause, extension-owned design, and proof strategy are locked.
- Priority set to `P0` because the bug can strand an active persistent goal after compaction.
- Next best session set to `green-loop implementation` because behavior is small but race-prone.
- Chosen first-pass fix targets `.pi/extensions/goal/` with `session_before_compact` / `session_compact` handling.
- Pi core `ctx.isIdle()` semantics are recorded as a possible companion improvement, not a blocker.
