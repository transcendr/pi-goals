# 05 — Proof plan

## Strengthened primary invariant

For every expected auto-continuation path that currently processes queued work after a terminal goal, optional post-completion action behavior must be incapable of suppressing that continuation. The implementation may skip dispatch only for ordinary stale state-machine reasons: queue missing, queue head changed, goal missing, goal id changed, incompatible terminal status, not idle/pending messages during retry. It must never skip because `context.reset` failed, was skipped by feature flag, lacked command-context capability, or threw internally.

## Validation sequence

```toon
toon.version: 1
validation_sequence[12]{order,name,command,pass_condition}:
  1,"sentrux_baseline","sentrux gate --save .pi/extensions/goal","exit 0 before implementation edits"
  2,"intent_normalization","node .ai/validation/goal-intent-normalization-probe.mjs","all ingress shapes normalize to expected action specs or actionable errors"
  3,"template_raw_directive","node .ai/validation/goal-template-raw-context-directive-probe.mjs","raw template arg directive survives even when template embeds args mid-body"
  4,"tool_schema_actions","node .ai/validation/goal-tool-post-completion-actions-schema-probe.mjs","structured params exist and conflict rules hold"
  5,"legacy_replay","node .ai/validation/goal-post-completion-legacy-replay-probe.mjs","legacy ISSUE-043 state/queue replays into compatible actions"
  6,"continuation_ticket","node .ai/validation/goal-continuation-ticket-probe.mjs","ticket is decided before action execution and revalidated by goalId/queueId"
  7,"nonblocking_failure","node .ai/validation/goal-post-completion-action-failure-nonblocking-probe.mjs","failed action records warning/state and still dispatches expected handoff"
  8,"feature_flags","node .ai/validation/goal-post-completion-feature-flag-probe.mjs","default-on flags and no-op/skipped runner preserve continuation"
  9,"compaction_ticket","node .ai/validation/goal-compaction-continuation-ticket-probe.mjs","compaction prequeue/fallback uses ticket semantics"
  10,"legacy_context_reset_suite","for f in $(ls .ai/validation/goal-context-reset-*.mjs | sort); do node \"$f\" || exit $?; done","updated context reset probes pass under new action semantics"
  11,"quality_gate","npm run quality:goal","Sentrux gate/check, slop guard, TypeScript, Pi offline load all pass"
  12,"live_probe","follow .ai/docs/pi-goals-live-probe-testing.md","real Pi transcript proves slash/template/action-failure or disabled-runner queue continuation and cleanup"
```

## Required proofs TOON

```toon
toon.version: 1
required_proofs[12]{name,source,command,pass_condition,scope,notes}:
  "sentrux_baseline","AGENTS.md","cd ~/dev/personal/experiments/pi-goals && sentrux gate --save .pi/extensions/goal","exit 0 before substantial implementation",run,"required project gate"
  "intent_normalization_probe","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-intent-normalization-probe.mjs","exit 0 and covers slash direct, slash template, slash queue block, create_goal, create_goal_from_template, enqueue_goal, and start queued direct/template shapes",run,"must fail if ingress paths parse actions differently"
  "template_raw_directive_probe","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-template-raw-context-directive-probe.mjs","exit 0 and proves trailing directive in raw template args becomes action metadata even when {{args}} expands mid-template",run,"guards reported /goal repo-worktree-inventory -- current state and summarize context bug"
  "structured_tool_actions_probe","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-tool-post-completion-actions-schema-probe.mjs","exit 0 and proves create_goal, create_goal_from_template, and enqueue_goal expose post_completion_context/post_completion_actions, normalize them, and reject conflicts with prose",run,"guards model-tool API"
  "continuation_ticket_probe","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-continuation-ticket-probe.mjs","exit 0 and proves queue handoff ticket is decided before action execution and revalidated only by goalId/queueId/status/queue state",run,"guards outbox-style continuation command"
  "action_failure_nonblocking_probe","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-post-completion-action-failure-nonblocking-probe.mjs","exit 0 and proves action failure records visible failure state but still dispatches expected queue handoff",run,"inverts old ISSUE-043 fail-closed proof"
  "compaction_handoff_ticket_probe","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-compaction-continuation-ticket-probe.mjs","exit 0 and proves compaction prequeue/fallback uses continuation ticket semantics and action status cannot suppress retry/handoff",run,"covers auto-continuation recovery path"
  "feature_flag_noop_probe","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-post-completion-feature-flag-probe.mjs","exit 0 and proves PI_GOAL_POST_COMPLETION_ACTIONS=0 and PI_GOAL_CONTEXT_RESET=0 mark/skip actions without blocking queue continuation",run,"guards default-on kill-switch strategy"
  "legacy_replay_migration_probe","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-post-completion-legacy-replay-probe.mjs","exit 0 and proves existing postCompletionContext/contextResetStatus fields replay into or coexist with the new action model",run,"protects existing sessions"
  "no_ts_escape_hatches","AGENTS.md","cd ~/dev/personal/experiments/pi-goals && ! rg -n 'as unknown as|as any' .pi/extensions/goal","exit 0",run,"project rule"
  "quality_goal","AGENTS.md","cd ~/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0",run,"required final quality gate"
  "live_probe_post_completion_actions","ISSUE-044","Use .ai/docs/pi-goals-live-probe-testing.md against pi-goals-live-probe","transcript shows /reload, direct slash summarize still works, template raw directive works, disabled/skipped or failed context reset does not block next queued goal, and cleanup leaves no unintended active goal/queue",live,"required for Pi tree/queue runtime behavior"
```

## False-green coverage matrix

```toon
false_green_matrix[10]{id,false_green,proof_that_must_fail}:
  "fg1","create_goal supports structured actions but /goal template still loses raw directive","template_raw_directive_probe"
  "fg2","raw directive parser accepts non-trailing mentions and strips ordinary objective text","intent_normalization_probe"
  "fg3","post_completion_actions schema exists but does not reject clear-vs-summarize conflict","structured_tool_actions_probe"
  "fg4","action failure is caught but continuation ticket is not dispatched","action_failure_nonblocking_probe"
  "fg5","PI_GOAL_CONTEXT_RESET=0 skips reset and accidentally drops queue handoff","feature_flag_noop_probe"
  "fg6","legacy postCompletionContext failed state still makes needs-reset gate suppress handoff","legacy_replay_migration_probe and action_failure_nonblocking_probe"
  "fg7","turn_end path works but agent_end or tool update still imports old needsPostCompletionContextReset gate","continuation_ticket_probe"
  "fg8","compaction fallback sends stale or duplicate handoff outside ticket revalidation","compaction_handoff_ticket_probe and existing compaction dedupe probes"
  "fg9","TypeScript passes by using escape-hatch casts around action/tool params","no_ts_escape_hatches"
  "fg10","deterministic probes pass but live Pi tree navigation or queue steering fails","live_probe_post_completion_actions"
```

## Existing probes to keep running

After updating semantics, the implementation must still run the broader goal validation suite where relevant:

```toon
existing_probe_groups[4]{group,examples,reason}:
  "context_reset","goal-context-reset-*.mjs","preserve successful clear/summarize/anchor/queue-stack behavior under action model"
  "queue_handoff","goal-complete-queue-handoff-probe.mjs; goal-complete-queue-dedupe-probe.mjs; goal-budget-limited-queue-handoff-probe.mjs","ensure core queue behavior unchanged"
  "compaction","goal-compaction-continuation-probe.mjs; goal-compaction-prequeue-dedupe-probe.mjs; goal-postcompact-retry-probe.mjs","ensure recovery paths still work"
  "floor_budget","goal-floor-steering-probe.mjs; goal-min-spend-floors-probe.mjs","guard unrelated goal semantics during refactor"
```

## Live proof protocol notes

The live proof must not hard-code process ids. Use the process-name discovery in `.ai/docs/pi-goals-live-probe-testing.md`.

Minimum transcript evidence:

```toon
live_evidence[5]{id,evidence}:
  "le1","/reload succeeds with no extension load error"
  "le2","/goal repo-worktree-inventory -- current state and summarize context produces a goal/action that summarizes context rather than treating the directive as template args"
  "le3","a disabled or failed context.reset action records visible warning/skipped/failure state"
  "le4","the next queued goal starts/continues despite the disabled or failed action"
  "le5","/goal clear and /goal queue cleanup leaves no unintended active goal or queued items"
```
