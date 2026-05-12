# 05 — Proof plan

## Strengthened proof threat model

Primary invariant:
- Compaction must not leave `pi-goals` work stranded when either an active goal needs continuation or a completed goal has a queued successor.

High-risk false greens and required failing proof:

| False green | Proof that must fail |
|---|---|
| Pre-compaction handler exists but does not queue real work | `precompact_active_queue_probe`, `precompact_completed_queue_probe` |
| Pre-compaction send only appends passive custom history | precompact probes must model queued-message semantics and fail when no queued message is observed |
| Completed goal + queue head is not handled | `precompact_completed_queue_probe` |
| Transient `notIdle` or `pendingMessages` skip remains terminal | `postcompact_retry_probe` |
| Prequeue and fallback duplicate messages | `compaction_dedupe_probe` |
| Paused/cleared/budget-limited goals continue | negative cases in precompact/retry probes |
| Created/resumed/agentEnd regress | existing continuation probes plus targeted call-site assertions or added regression cases |
| Static probes pass despite broken runtime behavior | new probes assert `sendMessage` calls/options and retry attempts, not only strings |

## Validation sequence

1. Pre-implementation baseline:

```bash
sentrux gate --save .pi/extensions/goal
```

2. Behavior probes:

```bash
node .ai/validation/goal-precompact-active-queue-probe.mjs
node .ai/validation/goal-precompact-completed-queue-probe.mjs
node .ai/validation/goal-postcompact-retry-probe.mjs
node .ai/validation/goal-compaction-prequeue-dedupe-probe.mjs
```

3. Existing regression probes:

```bash
node .ai/validation/goal-compaction-continuation-probe.mjs
node .ai/validation/goal-compaction-suppression-probe.mjs
node .ai/validation/goal-compaction-dedupe-telemetry-probe.mjs
node .ai/validation/goal-complete-queue-handoff-probe.mjs
node .ai/validation/goal-complete-queue-dedupe-probe.mjs
node .ai/validation/goal-budget-limited-queue-handoff-probe.mjs
```

4. Full required gate:

```bash
npm run quality:goal
```

5. Live proof or explicit skip:

```bash
test -s .ai/validation/goal-compaction-prequeue-live-probe-closeout.md
```

## Required proofs for issue writeback

```toon
toon.version: 1
required_proofs[7]{name,source,command,pass_condition,scope,notes}:
  "sentrux_baseline","AGENTS.md","cd /Users/bryan/dev/personal/experiments/pi-goals && sentrux gate --save .pi/extensions/goal","exit 0 and baseline saved before substantial implementation",run,"required before extension implementation"
  "precompact_active_queue_probe","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-precompact-active-queue-probe.mjs","exit 0 and output includes PASS goal_precompact_active_queues_followup",run,"must fail if active goal does not create real queued continuation before compaction"
  "precompact_completed_queue_probe","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-precompact-completed-queue-probe.mjs","exit 0 and output includes PASS goal_precompact_completed_queue_handoff",run,"must fail if completed goal plus queued next item can strand after compaction"
  "postcompact_retry_probe","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-postcompact-retry-probe.mjs","exit 0 and output includes PASS goal_postcompact_retry_transient_skip",run,"must fail if transient notIdle/pendingMessages skip is terminal"
  "compaction_dedupe_probe","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-compaction-prequeue-dedupe-probe.mjs","exit 0 and output includes PASS goal_compaction_prequeue_dedupe",run,"must fail if pre-queue and fallback duplicate work"
  "quality_goal","AGENTS.md","cd /Users/bryan/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0",run,"required extension quality gate"
  "live_probe_or_skip","issue doc","cd /Users/bryan/dev/personal/experiments/pi-goals && test -s .ai/validation/goal-compaction-prequeue-live-probe-closeout.md","exit 0 and closeout records bounded live pass or explicit deterministic-coverage skip rationale",run,"live runtime behavior was the failure source"
```

## Acceptance-pipeline hardening carry-forward

The separate queued template-hardening item should add a proof that acceptance aggregation rejects green rows with material gaps. Suggested validation:

```bash
node .ai/validation/goal-acceptance-template-contract-probe.mjs
```

Extend that probe or add a new one so it fails unless:
- `verify-acceptance-item.md` states green cannot have material gap/required next action;
- `verify-acceptance-pipeline.md` instructs the aggregator to reject green-with-real-gap rows and issue correction prompts.
