# 04 — Proof threat model for ISSUE-019

## Primary invariant

A multi-goal collection must preserve independent goal identity, budgets, proofs, worktree/session ownership, and steering context so that only the selected local-active goal receives local continuation/monitor/budget side effects, while other local/external goals remain inspectable and cannot be accidentally mutated or completed.

## High-risk false greens

1. `get_goal`/completion/continuation silently operate on the wrong goal after focus or switch.
2. Multiple local goals receive continuation or monitor steering in the same session.
3. Clearing/focusing/switching one goal mutates or removes unrelated goals.
4. Queue items, subgoals, and top-level goal records are conflated.
5. External parallel goal handles are treated as locally controlled and receive current-session steering.
6. Proof/budget/checkpoint state is shared across goals or used to complete the wrong goal.
7. UI says multiple goals exist but there is no durable replayable collection state.
8. Implementation silently spawns paid/background Pi sessions.
9. Existing single-goal sessions regress when no multi-goal collection exists.
10. Aggregate status hides blocked/failed/external goals or makes completion appear globally green.

## Deterministic proof strategy

Deterministic probes should cover state replay, focus/switch mutation boundaries, continuation isolation, queue/subgoal separation, and UI/tool summaries.

Required deterministic proof classes:

- collection replay preserves order, ids, statuses, focused id, local active id, and per-goal budgets;
- single-goal sessions without collection state render and mutate exactly as before;
- focus changes detail target only and does not schedule continuation;
- switch changes local active goal only after canceling/pausing the previous local active owner;
- completion/clear/update by focused/id target does not affect unrelated goals;
- external goal records cannot receive local continuation/monitor/budget wrap-up;
- queue and subgoal records remain separate from multi-goal top-level records;
- UI/tool list exposes aggregate counts and per-goal ownership compactly.

## Live proof strategy

A live probe is required if implementation includes actual external session/process launch. For the locked first pass, automatic background spawning is explicitly rejected; deterministic probes may be sufficient for collection/focus/switch behavior if external goals are metadata/adoption handles only.

If any implementation adds real external process/session launch, required proof must include:

- bounded disposable launch with explicit user/test-owned command;
- concurrency cap verification;
- cleanup of created session/process/worktree fixtures;
- proof that no launch happens from `focus` or `list` paths.

## Proof rows to carry into the issue doc

```toon
toon.version: 1
required_proofs[8]{name,source,command,pass_condition,scope,notes}:
  "quality_goal","ISSUE-019","cd /Users/bryan/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0","run","full extension quality gate after implementation"
  "multi_goal_replay_probe","ISSUE-019","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-multi-replay-probe.mjs","exit 0 and output includes PASS multi_goal_collection_replays","run","must fail if collection ids/status/focus/local-active/per-goal budgets are lost or older single-goal replay regresses"
  "focus_switch_probe","ISSUE-019","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-multi-focus-switch-probe.mjs","exit 0 and output includes PASS focus_switch_isolated","run","must fail if focus schedules continuation or switch leaves two local-active goals"
  "continuation_isolation_probe","ISSUE-019","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-multi-continuation-isolation-probe.mjs","exit 0 and output includes PASS only_local_active_continues","run","must fail if paused, focused-only, or external goals receive local continuation/monitor/budget side effects"
  "mutation_boundary_probe","ISSUE-019","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-multi-mutation-boundary-probe.mjs","exit 0 and output includes PASS per_goal_mutations_do_not_leak","run","must fail if clear/update/complete of one goal mutates unrelated goals"
  "queue_subgoal_boundary_probe","ISSUE-019","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-multi-queue-subgoal-boundary-probe.mjs","exit 0 and output includes PASS queue_subgoal_multi_goal_boundaries","run","must fail if queue items or ISSUE-015 subgoals are treated as parallel top-level goals"
  "multi_goal_render_probe","ISSUE-019","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-multi-render-probe.mjs","exit 0 and output includes PASS multi_goal_compact_rendering","run","must fail if list/tool/widget summaries hide ownership/status counts or break single-goal rendering"
  "live_parallel_probe_or_skip","ISSUE-019","cd /Users/bryan/dev/personal/experiments/pi-goals && test -s .ai/validation/goal-multi-live-probe-closeout.md","exit 0","run","record live external-session/process evidence if implemented, or an explicit deterministic-coverage skip rationale when first pass has metadata-only external handles"
```

## Coverage notes

- `quality_goal` protects broad extension health but cannot prove focus isolation.
- `multi_goal_replay_probe` guards the core durable state invariant and backward compatibility.
- `focus_switch_probe` and `continuation_isolation_probe` target the highest-risk cross-goal steering failures.
- `mutation_boundary_probe` targets accidental destructive operations across goals.
- `queue_subgoal_boundary_probe` prevents conflating existing queue/subgoal mechanisms with independent top-level goals.
- `multi_goal_render_probe` targets AXI/UI false greens where state exists but agents cannot reliably see ownership and status.
- `live_parallel_probe_or_skip` keeps the issue honest about whether the implementation actually launches parallel sessions or only tracks explicit external handles.
