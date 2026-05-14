# 04 — Proof threat model

## Primary invariant

A terminal pi-goal must dispatch the continuation that is expected by core goal/queue state regardless of context-reset/post-completion-action failure.

More specifically: when a goal is complete or budget-limited and the queue head is eligible for handoff in expected auto-continuation scenarios, the system must decide/capture that continuation independently from optional post-completion actions. Context reset may succeed, fail, skip, or be disabled by feature flag; none of those outcomes may be the reason the queue handoff is lost, suppressed, or stranded.

## Secondary invariants

```toon
toon.version: 1
invariants[8]{id,invariant}:
  "inv1","all slash/tool/template/queue creation inputs normalize through one GoalIntent/action extraction layer"
  "inv2","template args carrying a trailing context directive are parsed before template expansion can move the directive"
  "inv3","structured tool params can express post-completion actions without embedding control behavior in objective prose"
  "inv4","conflicting prose and structured action directives are rejected actionably rather than silently choosing one"
  "inv5","post-completion action runners cannot throw through lifecycle/orchestration boundaries"
  "inv6","feature flag disabled path behaves like a no-op action runner while preserving queue continuation"
  "inv7","legacy ISSUE-043 state/events replay safely through migration or compatibility parsing"
  "inv8","live Pi tree navigation reset remains bounded, visible on failure, and cleanup-safe"
```

## False-green risks

```toon
false_greens[10]{id,risk,why_shallow_tests_miss_it,required_counterproof}:
  "fg1","tool schema adds a param but slash/template paths still parse differently","unit tests may cover only create_goal","intent normalization probe across all ingress paths"
  "fg2","template directive works only when {{args}} is at the end of a template","happy-path template fixture may place args at tail","mid-template fixture proving raw invocation directive extraction"
  "fg3","reset failure is caught but continuation is still skipped by needsPostCompletionContextReset","failure UI test may pass while queue remains stranded","nonblocking failure handoff probe"
  "fg4","turn_end works but agent_end/compaction recovery still bypass or suppress continuation inconsistently","single lifecycle test misses recovery paths","continuation ticket probe covering turn_end, agent_end, dequeue, and compaction paths"
  "fg5","feature flag disables reset but also drops action metadata or queue handoff","flag test may only inspect config","no-op runner probe with queued goal continuation"
  "fg6","action model exists but old postCompletionContext replay breaks existing sessions","new-state tests pass on clean state only","legacy replay/migration fixture"
  "fg7","structured params and prose directives conflict silently","agent could create wrong reset behavior","conflict rejection tests"
  "fg8","live navigateTree failure is swallowed too silently","deterministic runner catches error but user loses diagnosis","probe asserts visible warning/telemetry without handoff loss"
  "fg9","required proofs are source-string assertions only","source checks pass after dead code or renamed paths","behavioral test harness invokes exported parser/orchestrator where practical"
  "fg10","no escape-hatch casts sneak in around Pi contexts","typecheck can pass with casts","explicit rg/AST scan for forbidden casts"
```

## Deterministic vs live proof adequacy

Deterministic probes are mandatory for parser, intent normalization, action state, feature flags, continuation tickets, and migration/replay. They are not sufficient for same-session tree navigation because the live behavior depends on Pi runtime `navigateTree`, branch summaries, UI messages, queue steering delivery, and session tree replay.

A bounded disposable live probe is required after implementation. It must cover at least:

- direct slash goal with summarize action;
- template slash invocation with directive in trailing raw args but non-trailing expanded template location;
- queued goal handoff after context reset failure or forced-disabled action runner;
- cleanup back to no active goal/queue.

## Required proofs

These proof rows are intended for the future implementation session. Commands that reference new validation probes are expected to fail until those probes are created by the implementation.

```toon
toon.version: 1
required_proofs[11]{name,source,command,pass_condition,scope,notes}:
  "sentrux_baseline","AGENTS.md","cd ~/dev/personal/experiments/pi-goals && sentrux gate --save .pi/extensions/goal","exit 0 before substantial implementation",run,"required project gate"
  "intent_normalization_probe","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-intent-normalization-probe.mjs","exit 0 and covers slash direct, slash template, slash queue block, create_goal, create_goal_from_template, enqueue_goal, and start queued direct/template shapes",run,"must fail if ingress paths parse actions differently"
  "template_raw_directive_probe","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-template-raw-context-directive-probe.mjs","exit 0 and proves trailing directive in raw template args becomes action metadata even when {{args}} expands mid-template",run,"guards reported /goal repo-worktree-inventory -- current state and summarize context bug"
  "structured_tool_actions_probe","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-tool-post-completion-actions-schema-probe.mjs","exit 0 and proves create_goal, create_goal_from_template, and enqueue_goal accept structured post-completion action params plus reject conflicts with prose",run,"guards model-tool API"
  "continuation_ticket_probe","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-continuation-ticket-probe.mjs","exit 0 and proves queue handoff/continue/noop ticket is decided before action execution and revalidated by goalId/queueId",run,"guards outbox-style continuation command"
  "action_failure_nonblocking_probe","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-post-completion-action-failure-nonblocking-probe.mjs","exit 0 and proves action failure records warning/failure state but still dispatches expected queue handoff",run,"inverts old ISSUE-043 fail-closed proof"
  "compaction_handoff_ticket_probe","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-compaction-continuation-ticket-probe.mjs","exit 0 and proves compaction prequeue/fallback uses the same continuation ticket semantics and cannot bypass action isolation",run,"covers auto-continuation recovery path"
  "feature_flag_noop_probe","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-post-completion-feature-flag-probe.mjs","exit 0 and proves disabled runner marks/skips actions without blocking queue continuation",run,"guards kill-switch strategy"
  "legacy_replay_migration_probe","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-post-completion-legacy-replay-probe.mjs","exit 0 and proves existing postCompletionContext/contextResetStatus state replays into or coexists with new action model",run,"protects existing sessions"
  "no_ts_escape_hatches","AGENTS.md","cd ~/dev/personal/experiments/pi-goals && ! rg -n 'as unknown as|as any' .pi/extensions/goal","exit 0",run,"project rule"
  "quality_goal","AGENTS.md","cd ~/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0",run,"required final quality gate"
```

## Required live proof

```toon
toon.version: 1
live_proofs[1]{name,source,command,pass_condition,scope,notes}:
  "post_completion_actions_live_probe","ISSUE-044","Use .ai/docs/pi-goals-live-probe-testing.md against the active pi-goals-live-probe process or spawn one if absent","transcript shows template raw directive action extraction, structured tool action path if available from live agent, action failure or disabled-runner nonblocking queue handoff, and cleanup to no active goal/queue",live,"deterministic tests cannot fully prove Pi tree navigation and queue steering behavior"
```
