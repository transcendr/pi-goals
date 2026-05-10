# 00 — Request intake

Issue: ISSUE-035
Slug: multi-item-goal-queue-block
Target issue path: `.ai/issues/open/ISSUE-035-multi-item-goal-queue-block.md`
Target bucket: open
Issue kind: feature
Requested title: Support multi-item /goal queue block input

## User request

The user wants to be able to paste a multi-line queue command and enqueue each listed item separately:

```text
/goal queue
[1] count to 15
[2] count to 10
[3] count to 5
[4] say "surprise!"
```

The user explicitly asked to run `/goal create-issue-doc` for this feature.

## Parsed feature intent

- Extend `/goal queue` beyond the current single-rest-argument enqueue/list behavior.
- Support a newline-delimited numbered/list block after `/goal queue`.
- Parse each list row as one queued goal objective.
- Preserve existing `/goal queue` with no args as list behavior.
- Preserve existing `/goal queue <single objective>` behavior.

## Assumptions

- This is a feature request, not an implementation request in this turn.
- First pass should create an execution-ready canonical issue doc if research can lock the scope.
- No clarification was needed because the example and desired behavior are concrete.

## Owner clarification during drafting

The user clarified that each numbered annotation can own multiple following lines until the next annotation. Example:

```text
[1] this is a goal
and it has another N lines
...
...
[2] this is the second goal
```

This updates the feature from simple one-line list rows to marker-delimited queue items with optional continuation lines.

## Ordered marker clarification

A later boomerang clarification confirmed that `[N]`-style markers should only be considered when they start a line and make sense in order. A repeated/nested example sequence inside goal 1 should remain goal-1 content when a later coherent `[2]` and `[3]` form the real top-level sequence.
