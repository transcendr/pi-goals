# 20 — UI/widget source recheck

## Sources inspected

- `.pi/extensions/goal/ui.ts`
- `.pi/extensions/goal/format.ts`
- `.pi/extensions/goal/widget.ts`

## Finding

The current UI/widget layer renders persistent goal state: objective, status, time/token usage, floors, and command hints. It does not render one-off action history such as monitor reports or future audit records.

## Implementation impact

First `/goal audit` implementation should not add widget-heavy audit history. The issue's choice to keep audit output in the visible transcript and bounded metadata outside full `GoalState` snapshots is consistent with current compact UI design.

If audit records are later summarized in `get_goal`, keep widget changes deferred unless there is a small current-audit indicator that does not crowd floor/budget rows.

## Proof implication

No first-pass widget proof is required. README/tool-output/prompt probes are enough unless implementation chooses to add UI rendering beyond docs.
