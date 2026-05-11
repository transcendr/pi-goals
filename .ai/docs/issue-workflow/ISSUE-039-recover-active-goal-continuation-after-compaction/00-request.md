# 00 — Request intake

Issue number/path choice: `ISSUE-039` because the current highest issue number is `ISSUE-038`.

Target issue path: `.ai/issues/open/ISSUE-039-recover-active-goal-continuation-after-compaction.md`

Transcript directory: `.ai/docs/issue-workflow/ISSUE-039-recover-active-goal-continuation-after-compaction/`

Parsed inputs:

- bucket: `open`
- kind: `fix`
- title: `Recover active goal continuation after compaction`
- context: convert the compaction-continuation investigation into an execution-ready issue doc with visible artifacts.

Queue/orchestration clarification:

- Queue item said `create-skill-doc`, but no such reusable goal template or workflow exists in this repo.
- Reusable-template check found `create-issue-doc` as the only workflow matching "canonical planning artifact and visible workflow artifacts".
- User explicitly answered `Use create-issue-doc` to resolve the ambiguous queued wording.

Assumptions:

- This is a `pi-goals` extension bug/fix issue, not a Pi core-only issue, because the first fix should make pi-goals compaction-aware.
- Pi core may need a companion improvement, but the canonical issue here should target `.pi/extensions/goal/` unless implementation discovers the extension API is insufficient.
- No additional clarification is required.
