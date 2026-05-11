# 11 — UI wording plan

## Footer/status

For active idle-nudge goals with a wait reason:

- `Goal waiting: <reason> (nudge in ~90s)`

Without a reason:

- `Goal waiting for idle nudge (nudge in ~90s)`

Manual mode:

- `Goal active; auto-continue off`

## Widget

Keep the card compact. Replace or augment the command/floor row with one short line when a wait policy is active:

- `wait idle_nudge 90s: <reason excerpt>`
- `auto manual`

## Tool output

`get_goal` should include exact policy, delay, wait reason, and waiting-since timestamp/elapsed seconds so agents can audit stale waits.

## Non-regression

Goals with missing/default policy should render exactly as today.
