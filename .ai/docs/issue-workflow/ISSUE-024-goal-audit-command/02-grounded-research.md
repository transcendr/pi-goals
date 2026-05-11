# 02 — Grounded research

## Planning/source files inspected

- `.ai/issues/refine/ISSUE-024-goal-audit-command.md`
- `.ai/docs/issue-workflow/refine-issue-leverage-order-2026-05-10/final-order.md`
- `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`
- `.ai/issues/open/ISSUE-015-goal-subgoals.md`
- `.ai/issues/fixed/ISSUE-020-goal-churn-monitor.md`
- `README.md`

## Code files inspected

- `.pi/extensions/goal/command.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/prompts.ts`
- `.pi/extensions/goal/completion-gate.ts`
- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/state.ts`
- `.pi/extensions/goal/monitor.ts`
- `.pi/extensions/goal/monitor-prompts.ts`

Raw grep scan: `raw/research-rg.log`.

## Current behavior facts

- `command.ts` supports only `pause`, `resume`, `clear`, and `queue` as control subcommands. There is no `/goal audit` command or autocomplete entry today.
- `prompts.ts` already embeds a qualitative completion audit checklist inside the continuation prompt before the model may call `update_goal(status: "complete")`. This is prompt guidance, not a user-invoked bounded audit surface.
- `tools.ts` routes completion through `decideGoalCompletion()` and already returns structured deferred completion data for floors. `/goal audit` must not call `update_goal(status:"complete")` or reuse completion-defer as its output mechanism.
- `completion-gate.ts` owns deterministic completion gating. Audit should read/consume gate state and proof/subgoal state, but it should not become a new completion gate by itself.
- `monitor.ts` and `monitor-prompts.ts` provide a separate third-party churn-monitor loop with hidden steering and XML decisions. Audit should not reuse monitor as judge; audit is a requested worker-facing review of completion readiness.
- `types.ts` has no audit record/event types. `PiGoalEventKind` currently covers `set`, `update`, `account`, `telemetry`, and `clear` only.
- `state.ts` persists and replays goal state through custom entries. If audit records are persisted, they should either use a distinct entry kind/type or bounded optional goal-adjacent state; do not bloat every `GoalState` snapshot with long audit prose.
- README documents `/goal`, `/goal queue`, `/goal pause`, `/goal resume`, `/goal clear`, tools, budgets, floors, templates, and churn monitor. It does not document audit.
- ISSUE-021 locks proof gates as runtime-enforced, durable evidence; audit should incorporate latest proof status when proof gates exist but remain qualitative and non-mutating.
- ISSUE-015 locks subgoal state as future parent-state completion blockers; audit should include blocking subgoal status when available.
- ISSUE-020 is fixed and explicitly rejected manual churn-check UX. ISSUE-024's dependency should point to `.ai/issues/fixed/ISSUE-020-goal-churn-monitor.md`, not a refine path.

## Gap list

- Add `/goal audit` command handling and autocomplete.
- Add a model-tool equivalent, likely `audit_goal`, so natural-language/user-driven audits do not depend on slash parsing.
- Add a dedicated audit prompt builder and steering details kind rather than overloading continuation, pause, or monitor prompts.
- Decide transcript/persistence semantics for audit records.
- Stale-guard audit turns by goal id and status; paused/budget-limited goals should be inspectable but not auto-continued.
- Add compact UI/tool output only if audit records persist; avoid crowding the widget in first pass.

## Planning impact

The issue can be made execution-ready by locking audit as: user/requested bounded steering + visible audit response, no automatic completion, no normal continuation scheduling, optional bounded audit-record persistence, and proof/subgoal/monitor state as inputs rather than owners.
