# 20 — Proof UI/rendering plan

Grounded in:

- `.pi/extensions/goal/format.ts`
- `.pi/extensions/goal/widget.ts`
- `.pi/extensions/goal/ui.ts`

## Current rendering constraints

`widget.ts` renders a fixed compact card:

1. objective excerpt;
2. time resource;
3. token resource;
4. floor line;
5. command line.

Narrow mode renders four compact lines. `format.ts` separately powers footer/status text and `goalSummaryLines(...)` for `/goal` summary notifications. `ui.ts` wires footer and widget via `syncGoalUi(...)`.

## Risk

If proof state is added as another always-visible widget line, the goal card becomes crowded, especially at narrow widths. If proof state is only hidden in tool details, users cannot see why completion is blocked or what evidence is missing.

## Recommended first-release rendering

### Tool/get_goal summary

Add the most detail here:

- required proof count;
- fresh passing count;
- first blocking proof id/reason;
- latest result timestamp for the blocking proof if present.

`get_goal` and proof tools are the best surfaces for actionable proof details.

### Footer/status text

Add only a short suffix when proof gates are blocking completion, for example:

```text
Pursuing goal (proofs 2/3 fresh; blocked: quality_gate)
```

Avoid listing commands or output excerpts in footer text.

### Widget card

Do not add a full proof line by default in the first release. Instead:

- replace `floor none` with a combined compact gate line only when proof gates exist and no floor is configured; or
- append proof state to the existing floor/gate line using a short token such as `proofs 2/3`.

Keep narrow mode to one proof/gate line maximum.

### `/goal` summary notification

Extend `goalSummaryLines(...)` with proof state after floors:

```text
Required proofs: 2/3 fresh
Blocking proof: quality_gate (failed)
```

This is the right place for human-readable state without crowding the always-visible widget.

## Monitor rendering boundary

`monitor-prompts.ts` currently renders only selected `GoalState` fields (`objective`, status, budgets, usage, timestamps) rather than dumping the whole goal object. If proof fields are added to `GoalState`, they will not automatically appear in monitor prompts. That is good for output-excerpt containment, but it means any monitor awareness of proofs must be an intentional compact proof report, not accidental serialization of full proof results.

Recommendation: add at most a compact `<proofs>` block to monitor reports later: required count, fresh-pass count, first blocking proof id/reason. Do not include stdout/stderr excerpts in monitor sparse reports.

## Deferred UI work

- Dedicated proof result viewer/editor.
- `/goal proof` command family.
- Rich proof history timeline; coordinate with ISSUE-022 checkpoints.
