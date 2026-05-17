# ISSUE-046 — Untruncated goal queue listing for agents

Status: open — execution-ready
Priority: P1
Owner: unassigned
Created: 2026-05-16
Next best session: green-loop implementation
Next best session rationale: The fix is localized to the queue tool output/API contract and can be proven with focused deterministic tool probes plus the standard `quality:goal` gate.
Target bucket: open
Issue kind: fix
Target repo roots:
- `~/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-027-goal-queue.md`
Depends on: none
Related:
- `.ai/issues/fixed/ISSUE-034-prevent-unsatisfied-queued-goal-discard.md`
- `.ai/issues/fixed/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode.md`
- `.pi/extensions/goal/queue-tools.ts`
- `.pi/extensions/goal/queue-state.ts`
- `.pi/extensions/goal/queue-steering.ts`
- `.pi/extensions/goal/command.ts`

## Goal

Make queued goal contents intentionally retrievable by agents without requiring persisted session JSONL spelunking, while preserving compact/default queue output for token safety and human-facing UI manageability.

## Transcript artifacts

- Request intake: `.ai/docs/issue-workflow/ISSUE-046-untruncated-goal-queue-listing-for-agents/execution-readiness/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-046-untruncated-goal-queue-listing-for-agents/execution-readiness/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-046-untruncated-goal-queue-listing-for-agents/execution-readiness/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-046-untruncated-goal-queue-listing-for-agents/execution-readiness/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-046-untruncated-goal-queue-listing-for-agents/execution-readiness/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-046-untruncated-goal-queue-listing-for-agents/execution-readiness/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-046-untruncated-goal-queue-listing-for-agents/execution-readiness/06-final-audit.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-046-untruncated-goal-queue-listing-for-agents/execution-readiness/raw/commands.log`

## Problem/context

`list_goal_queue` currently returns model-facing text with each queued objective truncated to 120 characters. Long queued orchestration goals can lose the actionable part of the request in the visible tool output. In the Pinotator session, an agent saw only:

```text
1. [q-1778925638320-8] create-issue-doc --bucket open --kind fix --title "Untruncated goal queue listing for agents" -- In /Users/bryan/dev/…
```

The full objective existed in persisted `pi-goal-state`/tool details, but the agent had to recover it from the Pinotator session JSONL instead of using an intentional queue details API.

This undermines queue safety: agents need to classify queue heads accurately before deciding whether to start a direct goal, use a reusable template, or leave a queue item in place.

## Desired behavior

- Default `list_goal_queue` output remains compact and bounded.
- If any queued objective is truncated in summary output, the output states that truncation occurred and tells the agent how to request full details.
- Agents can request full queued objective text through an explicit tool/API mode, without reading session JSONL.
- Full/details output maps each complete objective to its stable queue id and position.
- Existing no-arg `list_goal_queue` calls remain backward-compatible.
- Human-facing `/goal queue` output may remain compact by default; this issue primarily fixes the agent-facing tool/API surface.

## Grounded research findings

See `.ai/docs/issue-workflow/ISSUE-046-untruncated-goal-queue-listing-for-agents/execution-readiness/02-grounded-research.md`.

Key facts:

- `.pi/extensions/goal/queue-tools.ts` registers `list_goal_queue` with `EmptyParams`.
- `resultForQueue()` truncates each objective to 120 characters in returned text.
- `resultForQueuedGoal()` truncates the displayed objective after enqueue.
- `.pi/extensions/goal/command.ts` truncates slash queue output to 80 characters; that is a human/UI surface, not the primary bug.
- `.pi/extensions/goal/queue-steering.ts` already has a larger bounded preview constant (`OBJECTIVE_PREVIEW_CHARS = 4_000`), showing precedent for longer agent-facing previews.
- `.pi/extensions/goal/queue-state.ts` already stores full `QueuedGoal.objective`, so the fix should not need a queue data migration.

## Locked design choices

Chosen path: keep compact summary output by default and add an explicit full/details mode for agents.

Implementation should:

1. Extend `list_goal_queue` parameters from empty params to optional detail controls, such as `mode: "summary" | "full"`, `full: boolean`, or equivalent.
2. Preserve current no-arg behavior as summary mode.
3. In summary mode, include a truncation marker/metadata and an actionable full-details hint whenever any objective is truncated.
4. In full/details mode, include complete queued objective text for every item, or for a specified queue id if an optional filter is added.
5. Keep queue ids, order, budget fields, template metadata, and post-completion action metadata available enough for queue orchestration decisions.

Rejected alternatives:

- Always print full objectives by default: rejected because large queues/templates can consume excessive context.
- Rely on hidden tool result `details.queue`: rejected because the visible agent-facing tool text remains insufficient and undocumented.
- Force agents to inspect persisted session JSONL: rejected because this is brittle, indirect, and not part of the queue API.
- Change only queue steering: rejected because the failing surface is explicit queue listing.

## Execution checklist

- [ ] Run `sentrux gate --save .pi/extensions/goal` before substantial implementation.
- [ ] Add optional full/details parameters for `list_goal_queue`.
- [ ] Preserve no-arg `list_goal_queue` summary behavior.
- [ ] Add summary truncation metadata/hint when long objectives are clipped.
- [ ] Add full/details output that exposes complete queued objectives intentionally.
- [ ] Keep slash `/goal queue` compact unless deliberately extending the human command surface.
- [ ] Add deterministic probe coverage for summary, full/details, and backward compatibility modes.
- [ ] Run `npm run quality:goal`.

## Acceptance criteria

- [ ] No-arg `list_goal_queue` still succeeds and returns compact queue rows.
- [ ] Summary output indicates when queued objectives are truncated.
- [ ] Summary output tells agents how to request full queued objective text.
- [ ] Full/details mode returns complete objective text for long queued goals, including text beyond the old 120-character boundary.
- [ ] Full/details output clearly associates full objective text with queue id and queue position.
- [ ] Agents no longer need to read persisted session JSONL to recover queued objective text.
- [ ] Existing queue start/dequeue/remove behavior is unchanged.
- [ ] `npm run quality:goal` passes.

## Proof threat model

Primary invariant: agents must be able to retrieve the complete text of queued goals through an intentional `pi-goals` tool/API path without reading persisted Pi session JSONL, while default queue listing remains token-safe and backward compatible.

Likely false greens:

- Full objective text exists only in returned details but not in documented/model-facing content.
- The default list becomes unbounded and floods context.
- No-arg callers break because new parameters are required.
- Summary output truncates but provides no discoverable escape hatch.
- Existing queue consumption/start behavior regresses while output tests pass.

## TOON synthesis

```toon
toon.version: 1
issue[1]{id,title,status,goal,next_session}:
  "ISSUE-046","Untruncated goal queue listing for agents","open — execution-ready","make full queued objectives intentionally retrievable through queue tools","green-loop implementation"
locked_requirements[6]{id,requirement}:
  "lr1","preserve compact no-arg list_goal_queue behavior"
  "lr2","mark or describe truncation in summary output"
  "lr3","provide explicit full/details tool mode for complete queued objective text"
  "lr4","associate full objective text with stable queue id and position"
  "lr5","avoid requiring agents to inspect persisted session JSONL for normal queue handling"
  "lr6","preserve existing queue start dequeue remove semantics"
implementation_surfaces[5]{id,path,change}:
  "s1",".pi/extensions/goal/queue-tools.ts","add optional details mode and output formatting"
  "s2",".pi/extensions/goal/tool-schemas.ts","add or reuse optional list/details parameter schema if needed"
  "s3",".pi/extensions/goal/queue-state.ts","read existing full objective data; no migration expected"
  "s4",".pi/extensions/goal/command.ts","leave human slash queue compact unless deliberately adding a command flag"
  "s5",".ai/validation/goal-queue-list-details-probe.mjs","add deterministic summary full compat probe"
invariants[4]{id,invariant}:
  "inv1","summary output remains bounded by default"
  "inv2","full/details output exposes complete queued objective text through an intentional tool path"
  "inv3","queue ids and FIFO order remain stable"
  "inv4","existing queue lifecycle behavior is not changed by output formatting"
verification_checks[4]{id,check,evidence}:
  "v1","summary truncates long objective and gives details hint","queue list details probe summary mode"
  "v2","full mode includes a sentinel from the end of a long objective","queue list details probe full mode"
  "v3","no-arg list call remains valid","queue list details probe compat mode"
  "v4","standard extension quality gates pass","npm run quality:goal"
```

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
