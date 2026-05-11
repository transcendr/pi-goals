# 08 — Implementation handoff for ISSUE-019

## First implementation slice

Build the multi-goal collection core without launching external processes:

1. Add collection types and caps.
2. Add replay/persistence for collection events.
3. Add backward-compatible adapter behavior for existing single-goal sessions.
4. Add list/focus/switch/add tool and command surfaces.
5. Route continuation/monitor/budget side effects only through `localActiveGoalId`.
6. Render focused goal plus compact aggregate counts.
7. Add deterministic probes from the required proof block.

## Suggested module boundaries

- `.pi/extensions/goal/multi-state.ts`
  - collection event type/constants;
  - replay and persistence;
  - cap enforcement and defensive parsing;
  - single-goal compatibility adapter helpers.
- `.pi/extensions/goal/multi-tools.ts`
  - `list_goals`, `create_multi_goal`, `focus_goal`, `switch_active_goal`, `update_multi_goal`;
  - explicit `goal_id` handling;
  - structured AXI-friendly output.
- `.pi/extensions/goal/multi-format.ts` or additions to `format.ts`
  - aggregate count formatting;
  - compact list row helpers;
  - no-collection compatibility rendering.
- Minimal changes to existing files:
  - `types.ts`: shared public/domain types only;
  - `tools.ts`: registration delegation only;
  - `command.ts`: subcommand parsing/delegation only;
  - `lifecycle.ts`/`continuation.ts`: local-active lookup and stale guard integration;
  - `ui.ts`/`widget.ts`: focused goal plus aggregate rendering.

## Implementation guardrails

- Do not create multiple local-active goals in one session.
- Do not silently spawn any Pi process or model session.
- Do not store queue items or ISSUE-015 subgoals as top-level goal records.
- Do not let `focus` schedule continuation.
- Do not let external goal handles receive current-session continuation/monitor/budget wrap-up.
- Do not let `clear_goal` semantics accidentally clear the entire collection unless a separate explicit collection-clear command/tool is requested.
- Keep single-goal behavior unchanged until the user explicitly creates/uses a multi-goal collection.

## First validation order

1. `goal-multi-replay-probe.mjs`
2. `goal-multi-focus-switch-probe.mjs`
3. `goal-multi-continuation-isolation-probe.mjs`
4. `goal-multi-mutation-boundary-probe.mjs`
5. `goal-multi-queue-subgoal-boundary-probe.mjs`
6. `goal-multi-render-probe.mjs`
7. `npm run quality:goal`
8. `goal-multi-live-probe-closeout.md` if external launch is implemented, otherwise deterministic-coverage skip rationale.

## Stop point

Stop the first pass when users/agents can safely maintain a visible multi-goal set, switch the one local-active goal, track external handles without driving them, and prove no cross-goal steering or mutation leakage. Do not expand into dependency solving, hidden parallel spawning, or dashboard UI before this foundation is green.
