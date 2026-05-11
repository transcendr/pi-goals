# 10 — Validation probe plan

## Probe 1: suppress immediate continuation

Construct an active goal with `autoContinueMode: "idle_nudge"`, simulate `agent_end`, and assert no immediate follow-up is sent before the delayed interval.

## Probe 2: stale guard

Schedule an idle nudge, then mutate goal status/id/pending-message conditions. Assert the delayed nudge does not fire.

## Probe 3: manual mode

Construct an active goal with `autoContinueMode: "manual"`, simulate `agent_end`, and assert no immediate continuation and no delayed timer.

## Probe 4: replay/defaults

Replay older events without policy fields and configured events with policy fields. Assert older goals behave as immediate and configured idle fields survive.

## Probe 5: rendering

Assert tool/footer/widget summaries distinguish active waiting from paused, and no-policy goals render as before.
