# 04 — Proof threat model

## Primary invariant

A goal queue stack that summarizes context between completed goals must continue to the next queued goal exactly once without losing queued work, replaying stale queue steers, or poisoning Codex/tool-call state.

Secondary invariant: `clear` context reset is default-off behind an explicit gate and, when disabled, cannot navigate or interfere with goal/queue continuation.

## False-green risks

```toon
toon.version: 1
false_green_risks[8]{id,risk,proof_that_catches_it}:
  "fg1","continuation ticket still stores only queueId and loses queued payload after navigation","queue_payload_repair_probe plus live summarize stack"
  "fg2","queue handoff dispatches before navigation and stale steer is replayed after navigation","stale_queue_steer_suppression_probe plus live tree transcript"
  "fg3","clear is hidden in docs but still enabled by default in runtime","clear_default_off_probe"
  "fg4","clear is silently downgraded to summarize","clear_default_off_probe checks no navigateTree call and skipped/disabled status"
  "fg5","summarize queue stack avoids queue loss but still triggers Codex No tool call found error","summarize_queue_stack_live_probe requires absence of Codex error"
  "fg6","manual tree navigation semantics are broken by making queue globally durable","manual_tree_replay_probe or targeted replay test proves branch-local queue mutations still revert outside automated reset repair"
  "fg7","model-tool enqueue/start still creates repeated queue-steer branches after completion","model_tool_enqueue_steer_dedupe_live_probe"
  "fg8","deterministic probes pass but real Pi navigateTree branch behavior still fails","bounded live probe required"
```

## Deterministic proof strategy

Add/extend deterministic probes for pure/domain pieces:

- clear flag parsing and clear action skip/default-off behavior;
- continuation envelope captures full queued payload before actions;
- post-navigation repair replays/merges queued payload only for pi-goal initiated reset;
- stale queue-steer validation rejects consumed/generation-mismatched steers;
- manual branch replay still follows normal branch semantics;
- model-tool enqueue/start consumes queue once and invalidates stale steering.

## Live proof strategy

A bounded live probe remains mandatory because deterministic probes cannot prove Pi/Codex tree navigation and tool-call state behavior.

The key live proof must run a realistic stack:

1. start first goal with `and summarize context`;
2. enqueue `count to 2` while first goal is active;
3. first goal completes and summarizes/navigates;
4. no `No tool call found for function call output` appears;
5. queued `count to 2` starts exactly once and completes;
6. `/tree` or transcript does not show repeated stale `pi-goal-queue-steer` branches;
7. cleanup leaves no active goal and no queued goals.

## Required proofs

```toon
toon.version: 1
required_proofs[10]{name,source,command,pass_condition,scope,notes}:
  "sentrux_baseline","AGENTS.md","cd ~/dev/personal/experiments/pi-goals && sentrux gate --save .pi/extensions/goal","exit 0 before substantial implementation",run,"required project gate"
  "clear_default_off_probe","ISSUE-045","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-context-reset-clear-default-off-probe.mjs","exit 0; proves PI_GOAL_CONTEXT_RESET_CLEAR defaults disabled, clear action skips/warns without navigateTree, explicit enable allows clear",run,"new probe"
  "queue_payload_repair_probe","ISSUE-045","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-context-reset-queue-payload-repair-probe.mjs","exit 0; proves queued head payload is cached before navigation and replayed/merged after automated reset if branch replay lost it",run,"new probe"
  "stale_queue_steer_suppression_probe","ISSUE-045","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-queue-steer-generation-probe.mjs","exit 0; proves consumed/generation-mismatched pi-goal-queue-steer messages are invalid after dequeue/start/completion and navigation repair",run,"new probe"
  "manual_tree_replay_probe","ISSUE-045","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-queue-manual-tree-replay-probe.mjs","exit 0; proves manual branch replay before an enqueue still removes that queue mutation outside automated reset repair",run,"new or targeted replay probe"
  "model_tool_enqueue_once_probe","ISSUE-045","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-model-tool-enqueue-start-once-probe.mjs","exit 0; proves enqueue_goal/start_queued_goal/update_goal consumes one queued item and invalidates stale queue steering",run,"new probe"
  "existing_post_completion_probes","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-context-reset-action-runner-probe.mjs && node .ai/validation/goal-post-completion-action-failure-nonblocking-probe.mjs && node .ai/validation/goal-post-completion-feature-flag-probe.mjs && node .ai/validation/goal-tool-post-completion-actions-schema-probe.mjs","all commands exit 0",run,"regression guard for ISSUE-044 behavior"
  "no_ts_escape_hatches","AGENTS.md","cd ~/dev/personal/experiments/pi-goals && ! rg -n 'as unknown as|as any' .pi/extensions/goal","exit 0",run,"project rule"
  "quality_goal","AGENTS.md","cd ~/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0",run,"required final gate"
  "summarize_queue_stack_live_probe","ISSUE-045","Use .ai/docs/pi-goals-live-probe-testing.md with a fresh pi-goals-live-probe process; capture transcript under /tmp","transcript shows summarize navigation, no Codex No tool call found error, queued count-to-2 starts exactly once and completes, no repeated stale pi-goal-queue-steer branches, cleanup leaves no active goal/queue",live,"mandatory because real failure is live tree/tool-call behavior"
```

## Acceptance/proof alignment

Every required proof is tied to a failure observed in manual/live testing. A solution that only makes isolated direct clear/summarize goals pass is insufficient; those already passed before this issue.
