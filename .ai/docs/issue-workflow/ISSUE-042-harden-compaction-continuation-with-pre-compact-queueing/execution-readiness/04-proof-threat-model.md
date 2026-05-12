# 04 — Proof threat model

Primary invariant:
- If a pi-goal needs follow-up work across compaction — active goal continuation or completed-goal queue handoff — the session must not go idle after compaction with that work stranded.

Likely false greens:
1. Source contains `session_before_compact` strings but no actual queued message is produced.
2. The pre-compaction message is appended as passive custom history rather than becoming an agent queued message, so Pi core `hasQueuedMessages()` does not resume after compaction.
3. A post-compaction fallback fires once, sees `notIdle` or `pendingMessages`, records a skip, and never retries.
4. Both pre-queued follow-up and fallback fire, causing duplicate continuation/queue-handoff prompts.
5. Active goals are handled, but completed goals with queued work are still stranded.
6. Static probes pass while live runtime still idles after compaction.
7. Safety guards regress and paused/cleared/budget-limited goals continue after compaction.
8. Acceptance-pipeline reports green while still listing material gaps/next actions.

Deterministic proof strategy:
- Add mock/runtime probes that instantiate the relevant extension functions with fake `pi`, `ctx`, goal state, queue state, and controllable idle/pending-message sequences.
- Assert actual `sendMessage` calls and options, not only source strings.
- Assert retry counts and terminal telemetry for transient and non-transient states.
- Assert dedupe keys prevent duplicate pre/fallback sends for the same goal/queue item.

Live proof strategy:
- Run a bounded disposable live probe in `pi-goals-live-probe` unless deterministic probes directly exercise the extension runtime boundaries and the closeout explicitly justifies skipping live reproduction.
- Live probe should avoid overflowing real user context; use a controlled or disposable goal/queue setup and force/trigger compaction where safe.

Required proof rows proposed for the issue doc:
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

Proof adequacy gate:
- Do not accept source-string-only probes as sufficient for pre-compaction queueing or retry behavior.
- A green acceptance row must have `gap="none"` or only immaterial caveats. If a material gap/required next action remains, the status should be red or blocked.
