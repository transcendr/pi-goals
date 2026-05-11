# 18 — Parent pipeline readback

## Source inspected

- `.ai/.pi-goals/deslop-pipeline.md`

## Finding

`deslop-pipeline` is an exact top-level orchestration workflow with explicit stop/escalate behavior when preflight finds dirty worktree state. ISSUE-015's reference use case is more ergonomic than the current stop/escalate pattern: the parent should enter a blocking nested cleanup child, then resume the parent at the Sentrux baseline step.

## Impact

This confirms ISSUE-015's parent `returnToParent` field is not decorative. It must preserve enough step-level context for continuation prompts to resume the parent workflow after a child completes.
