# 04 Proof Threat Model — ISSUE-046

## Primary invariant

Agents must be able to retrieve the complete text of queued goals through an intentional `pi-goals` tool/API path without reading persisted Pi session JSONL, while default queue listing remains token-safe and backward compatible.

## False-green risks

| Risk | Why it could pass shallow checks | Proof that should fail |
|---|---|---|
| Default list still truncates but no full mode exists | Existing tests only assert queue rows render | `queue_full_details_probe` |
| Full text exists only in tool `details`, not model-facing content | Tests inspect returned object details instead of displayed content | `queue_full_details_probe` must inspect content text and details contract |
| Full mode prints huge output by default | A long-objective test passes but token safety regresses | `queue_summary_truncation_probe` |
| No-arg `list_goal_queue` schema changes break existing agents | New options are required rather than optional | `queue_backward_compat_probe` |
| Summary says truncated but gives no escape hatch | Agent still must guess hidden API behavior | `queue_summary_truncation_probe` |
| Slash human queue output is accidentally made noisy | Implementer broadens `/goal queue` default without owner intent | `quality_goal` plus code review; optional command probe if command changed |
| Session JSONL incident evidence is not preserved in issue | Future implementer misses why this matters | final issue doc and transcript artifact links |

## Deterministic proof strategy

A focused probe should register the queue tools in a lightweight fake Pi harness, seed a queue item with a long objective, call `list_goal_queue` both with default params and full/details params, and assert:

- default text remains bounded and marks/hints truncation;
- full/details text includes a sentinel near the end of the long objective;
- full/details output includes queue id and enough metadata to map full text to the queue item;
- no-arg call still succeeds.

## Live proof strategy

A full live Pi probe is useful but not mandatory for first implementation if deterministic tool probes exercise the registered tool execute path. If the implementation changes command/UI runtime behavior beyond `queue-tools.ts`, run a bounded live probe against `pi-goals-live-probe` to verify real agent-facing output.

## Required proofs

```toon
toon.version: 1
required_proofs[5]{name,source,command,pass_condition,scope,notes}:
  "pre_sentrux_gate","issue doc","cd ~/dev/personal/experiments/pi-goals && sentrux gate --save .pi/extensions/goal","exit 0 before substantial implementation",run,"required by AGENTS for pi-goals implementation"
  "queue_summary_truncation_probe","issue doc","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-queue-list-details-probe.mjs --summary","exit 0; default list is bounded, indicates truncation, and provides a full/details escape hatch",run,"new or updated deterministic probe"
  "queue_full_details_probe","issue doc","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-queue-list-details-probe.mjs --full","exit 0; full/details mode exposes complete queued objective text including an end sentinel without JSONL recovery",run,"must inspect model-facing content and/or documented details contract"
  "queue_backward_compat_probe","issue doc","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-queue-list-details-probe.mjs --compat","exit 0; no-arg list_goal_queue still succeeds for existing callers",run,"protect existing tool consumers"
  "quality_goal","issue doc","cd ~/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0",run,"Sentrux gate/check, slop guard, TypeScript, Pi extension load"
```
