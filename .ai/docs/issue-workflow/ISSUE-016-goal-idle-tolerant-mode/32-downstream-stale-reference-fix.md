# 32 — Downstream stale reference fix

## Trigger

Final reference audit found a downstream dependency still pointing at the pre-promotion refine path:

- `.ai/issues/refine/ISSUE-023-goal-dependency-triggers-and-watchers.md`

## Change made

Updated:

```diff
- Depends on: `.ai/issues/refine/ISSUE-016-goal-idle-tolerant-mode.md`
+ Depends on: `.ai/issues/open/ISSUE-016-goal-idle-tolerant-mode.md`
```

## Reason

ISSUE-016 is now canonical in `.ai/issues/open`, so downstream dependency metadata must point to the execution-ready issue rather than the removed refine copy.
