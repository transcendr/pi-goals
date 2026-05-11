# 13 — Stale reference audit for ISSUE-022

## Check performed

Searched canonical open issues, the current leverage-order file, and the ISSUE-022 workflow artifacts for the old promoted path:

```text
.ai/issues/refine/ISSUE-022-goal-history-checkpoints-and-compaction.md
```

Command output is appended in `raw/commands.log`.

## Result

- Canonical open issue docs do not point to the old refine path for ISSUE-022.
- `.ai/docs/issue-workflow/refine-issue-leverage-order-2026-05-10/final-order.md` now points to `.ai/issues/open/ISSUE-022-goal-history-checkpoints-and-compaction.md`.
- ISSUE-022's own workflow artifacts intentionally retain a few references to the old refine path as historical source-input evidence (`00-request.md`, `02-grounded-research.md`, and `05-issue-writeback.md` context). These are not active dependency declarations.

## Audit conclusion

Stale dependency/reference resolution is satisfied for canonical docs. Historical transcript mentions are acceptable and should not be rewritten because they document the input state before promotion.
