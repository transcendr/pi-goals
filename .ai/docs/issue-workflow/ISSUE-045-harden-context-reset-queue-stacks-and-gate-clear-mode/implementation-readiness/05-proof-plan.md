# 05 — Proof plan

## Strengthened proof threat model

Primary invariant: summarize context reset in a goal queue stack must preserve and start the next queued goal exactly once without stale queue-steer loops or Codex tool-call desync.

Secondary invariant: clear context reset is default-off and cannot navigate unless explicitly enabled.

## False-green coverage

```toon
toon.version: 1
proof_coverage[8]{risk,proof_that_fails_if_risk_present}:
  "clear still navigates by default","clear_default_off_probe"
  "clear silently downgrates to summarize","clear_default_off_probe"
  "queue repair only stores queueId and loses objective/template/budgets/actions","queue_payload_repair_probe"
  "repair makes queue globally durable and breaks manual tree semantics","manual_tree_replay_probe"
  "stale queue-steer messages remain valid after dequeue/start/completion","stale_queue_steer_suppression_probe"
  "model-tool enqueue/start processes same queue item repeatedly","model_tool_enqueue_once_probe and live probe tree transcript"
  "update_goal still navigates during tool execution and desyncs Codex","summarize_queue_stack_live_probe absence of No tool call found error"
  "deterministic probes miss real Pi tree behavior","summarize_queue_stack_live_probe"
```

## Required proof rows for issue writeback

```toon
toon.version: 1
required_proofs[11]{name,source,command,pass_condition,scope,notes}:
  "sentrux_baseline","AGENTS.md","cd ~/dev/personal/experiments/pi-goals && sentrux gate --save .pi/extensions/goal","exit 0 before substantial implementation",run,"required project gate"
  "clear_default_off_probe","ISSUE-045","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-context-reset-clear-default-off-probe.mjs","exit 0; clear defaults disabled; disabled clear returns skipped/warning and does not call navigateTree; explicit enable allows clear",run,"new deterministic probe"
  "queue_payload_repair_probe","ISSUE-045","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-context-reset-queue-payload-repair-probe.mjs","exit 0; continuation envelope captures queued payload; post-navigation repair restores exact queue head only when safe",run,"new deterministic probe"
  "stale_queue_steer_suppression_probe","ISSUE-045","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-queue-steer-generation-probe.mjs","exit 0; queue steer details include revision; stale/consumed/missing-revision steers are invalid",run,"new deterministic probe"
  "manual_tree_replay_probe","ISSUE-045","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-queue-manual-tree-replay-probe.mjs","exit 0; normal branch replay before enqueue does not preserve queued mutation outside automated repair",run,"new deterministic replay probe"
  "model_tool_enqueue_once_probe","ISSUE-045","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-model-tool-enqueue-start-once-probe.mjs","exit 0; enqueue_goal/start_queued_goal/update_goal consumes one queued item, records sourceQueueId, invalidates stale steers, and does not repeat",run,"new deterministic probe"
  "existing_post_completion_probes","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-context-reset-action-runner-probe.mjs && node .ai/validation/goal-post-completion-action-failure-nonblocking-probe.mjs && node .ai/validation/goal-post-completion-feature-flag-probe.mjs && node .ai/validation/goal-tool-post-completion-actions-schema-probe.mjs","all commands exit 0",run,"regression guard"
  "typecheck_goal","package.json","cd ~/dev/personal/experiments/pi-goals && npm run typecheck:goal","exit 0",run,"narrow TypeScript gate"
  "no_ts_escape_hatches","AGENTS.md","cd ~/dev/personal/experiments/pi-goals && ! rg -n 'as unknown as|as any' .pi/extensions/goal","exit 0",run,"project rule"
  "quality_goal","AGENTS.md","cd ~/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0",run,"required final quality gate"
  "summarize_queue_stack_live_probe","ISSUE-045","Use .ai/docs/pi-goals-live-probe-testing.md with a fresh pi-goals-live-probe process; capture transcript under /tmp","transcript shows first goal summarizes/navigates, no Codex No tool call found error, queued count-to-2 starts exactly once and completes, no repeated stale pi-goal-queue-steer branches, cleanup leaves no active goal/queue",live,"mandatory live proof"
```

## Validation order

1. `sentrux gate --save .pi/extensions/goal` before implementation.
2. Red deterministic probes.
3. Phase-local probes after each patch phase.
4. Existing post-completion regression probes.
5. `npm run typecheck:goal` after type-shape changes.
6. `! rg -n 'as unknown as|as any' .pi/extensions/goal`.
7. `npm run quality:goal`.
8. Fresh live summarize queue-stack probe.
9. If live fails, do not close; capture transcript and update issue/implementation plan.

## Live probe minimum script

Use a fresh process, not the polluted manual sessions.

```text
/goal clear
/goal queue
/goal count to 1 and summarize context
/goal queue count to 2
```

Expected transcript:

- visible first objective `count to 1`;
- queued goal `count to 2` visible before completion;
- branch summary and `Navigated to selected point` after first goal;
- no `No tool call found for function call output`;
- queued goal starts once, counts `1`, `2`, and completes;
- `/tree` or transcript shows no repeated `pi-goal-queue-steer` chain;
- cleanup `/goal clear` and `/goal queue` leaves no active goal/queue.
