# 08 — Implementation handoff for ISSUE-023

## First implementation slice

Build the watcher foundation without process/session/network/cross-agent protocols:

1. Add watcher domain types and constants.
2. Add dedicated watcher replay/persistence helpers.
3. Add runtime polling for `file_exists`, `file_changed`, `file_contains`, and argv-only `command_exit`.
4. Add one-shot satisfaction and bounded delivery state.
5. Add stale-guarded watcher nudge delivery integrated with continuation semantics.
6. Add add/list/cancel tools and `/goal watch` commands.
7. Add compact formatting and README docs.
8. Add deterministic probes named in the required proof block.

## Suggested module boundaries

- `.pi/extensions/goal/watchers-state.ts`
  - event parsing and replay;
  - watcher record normalization;
  - cap validation;
  - persisted status transitions.
- `.pi/extensions/goal/watchers-runtime.ts`
  - timer lifecycle;
  - file checks;
  - command execution wrapper;
  - satisfaction and delivery scheduling;
  - reload rehydration and cancellation.
- `.pi/extensions/goal/watchers-tools.ts`
  - `add_goal_watcher`, `list_goal_watchers`, `cancel_goal_watcher`;
  - AXI-friendly structured output and actionable errors.
- `.pi/extensions/goal/watchers-format.ts` or focused additions to `format.ts`
  - compact list rows;
  - terminal-state summaries;
  - command/path truncation helpers.

Keep existing files thin:

- `types.ts`: shared domain types only;
- `tools.ts`: registration delegation only;
- `command.ts`: parse/delegate only;
- `lifecycle.ts`: replay/rehydrate/cancel hooks only;
- `continuation.ts`: watcher nudge integration only.

## Implementation guardrails

- Do not accept arbitrary shell strings for first-pass command watchers.
- Do not allow watcher commands to read stdin or run without time/output caps.
- Do not let watchers run for paused, complete, budget-limited, external, or wrong-cwd goals.
- Do not deliver more than one nudge for one satisfied watcher without explicit re-arm.
- Do not hide terminal watcher states from `list_goal_watchers`.
- Do not conflate watchers with the queue or ISSUE-015 subgoals.
- Do not implement network/process/session/cross-agent watchers in this first slice.

## First validation order

1. `goal-watcher-schema-caps-probe.mjs`
2. `goal-watcher-replay-reload-probe.mjs`
3. `goal-watcher-stale-guard-probe.mjs`
4. `goal-watcher-one-shot-delivery-probe.mjs`
5. `goal-watcher-command-safety-probe.mjs`
6. `goal-watcher-render-cancel-probe.mjs`
7. `npm run quality:goal`
8. `goal-watcher-live-probe-closeout.md` if runtime polling/command execution is implemented, otherwise deterministic-coverage skip rationale.

## Stop point

Stop the first pass when a local active idle-tolerant goal can safely register bounded file/command watchers, see and cancel them, survive reload without duplicate timers, and receive at most one correct stale-guarded nudge. Leave recurring/network/process/session/cross-agent triggers for later issues.
