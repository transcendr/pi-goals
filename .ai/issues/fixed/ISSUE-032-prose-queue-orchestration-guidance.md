# ISSUE-032 — Prose queue orchestration guidance

Status: fixed — implemented
Priority: P1
Owner: pi-goal automation
Created: 2026-05-09
Next best session: focused implementation/probe pass
Next best session rationale: The design choice is locked by user direction and live code research; implementation should be limited to queue steering guidance plus focused prompt-content probes unless a tiny adjacent prompt-guideline update is discovered.
Target bucket: open
Issue kind: feature
Target repo roots: `~/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-027-goal-queue.md`
Depends on: `.ai/issues/fixed/ISSUE-030-queued-goal-steering.md`
Related:
- `.ai/issues/fixed/ISSUE-026-nl-reusable-goal-prompts.md`
- `.ai/issues/fixed/ISSUE-031-goal-queue-template-autocomplete.md`

## Goal

Make queued-goal steering treat prose/JIT orchestration as a first-class workflow without adding brittle prose parsing or unnecessary specialized tools.

When a queue head is ready, the injected steering should tell the agent that the queued objective may be either:

1. a direct goal to start with `start_queued_goal`; or
2. prose orchestration that should be interpreted using current context to create/start/enqueue one or more concrete goals with existing goal tools.

The orchestration queue item must remain queued until the requested orchestration is satisfied.

## Problem/context

The queue now supports durable FIFO storage, direct enqueue, completion/clear steering, template metadata steering, and atomic direct handoff through `start_queued_goal`.

A remaining workflow is intentionally more flexible than template metadata. Users may queue prose that cannot be resolved until a prior goal creates new facts. Examples:

- Queue item 1: execute issue stack X-Z.
- Queue item 2: create a `deslop-commit-range` goal for the commits just landed by item 1.
- Queue item 3: run dirty-worktree cleanup.

At enqueue time, item 2 cannot know the future commit range. The agent must interpret the prose JIT after item 1 completes, create/start the concrete deslop goal from current context, and consume item 2 only after that orchestration is done. Similar flow: after a `create-issue-doc` goal reveals a new issue id, a queued prose item can create/start an `execute-issue-stack` goal for that new issue id.

Current `queueSteeringContent()` has special handling for entries that are already structured template-origin goals (`goal.template` exists), but plain prose orchestration is not covered. Adding parser heuristics for phrases like "create a goal from template" would be brittle and contrary to the desired feature: flexible prose queue items should stay agent-interpreted.

## Transcript artifacts

- Request intake: `.ai/docs/issue-workflow/ISSUE-032-prose-queue-orchestration-guidance/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-032-prose-queue-orchestration-guidance/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-032-prose-queue-orchestration-guidance/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-032-prose-queue-orchestration-guidance/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-032-prose-queue-orchestration-guidance/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-032-prose-queue-orchestration-guidance/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-032-prose-queue-orchestration-guidance/06-final-audit.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-032-prose-queue-orchestration-guidance/raw/commands.log`

## Research findings

Grounded research is recorded in `02-grounded-research.md`.

Key findings:

- `.pi/extensions/goal/queue-steering.ts` builds hidden `deliverAs: "steer"` content through `queueSteeringContent()`.
- Current steering distinguishes direct plain queue entries from entries with structured `goal.template` metadata.
- `.pi/extensions/goal/queue-tools.ts` already provides `start_queued_goal` for atomic direct handoff and `dequeue_goal` for manual consumption after separate successful handling.
- `.pi/extensions/goal/tools.ts` already provides `create_goal` and `create_goal_from_template` for explicit JIT goal creation.
- `.pi/extensions/goal/queue-state.ts` stores/replays FIFO order with append/push and shift; this issue does not need queue ordering changes.
- Existing focused probe `/tmp/pi-goal-queue-template-steer-probe.cjs` covers structured template metadata steering but not prose orchestration guidance for non-template queue entries.
- `sentrux gate .pi/extensions/goal` reports no degradation from the current baseline.

## Locked design choices

Chosen design: **prompt-guidance-only first pass using existing primitives**.

Implementation should:

- Add unconditional direct-vs-orchestration guidance to `queueSteeringContent()`.
- Preserve `start_queued_goal` as the simple, recommended path for direct queued goals.
- Preserve structured template metadata guidance when `goal.template` exists.
- Tell the agent to semantically interpret prose/JIT orchestration using current context rather than relying on code parser heuristics.
- Tell the agent to create/start/enqueue the requested concrete goal(s) with existing tools when the queue item is orchestration prose.
- Explicitly allow one orchestration queue item to require as many consecutive active goals as needed before the agent calls `dequeue_goal`.
- Tell the agent to call `dequeue_goal` only after the orchestration item is satisfied.
- Tell the agent to leave the queue item in place when blocked or uncertain.

Rejected alternatives:

- Parser/heuristic detection for prose such as "create a goal from template": brittle, incomplete, and contrary to prose-as-feature.
- New specialized queue expansion/reordering tools now: unnecessary for the demonstrated workflow and contrary to the minimal-tool preference.
- Treat all plain queued objectives as direct goals: keeps current under-guidance and misleads agents on orchestration queue items.

## Implementation checklist

- [x] Update `.pi/extensions/goal/queue-steering.ts` so `queueSteeringContent()` always explains the two queue-head modes: direct queued goal vs prose/JIT orchestration.
- [x] Keep direct-goal guidance centered on `start_queued_goal`.
- [x] Keep template-origin fallback guidance to `create_goal_from_template` when metadata exists.
- [x] Add explicit prose/JIT guidance: use current context, create/start/enqueue concrete goal(s) with existing tools, and do not parse prose in extension code.
- [x] Add explicit multi-goal guidance: one orchestration queue item may require one or more consecutive active goals before dequeue.
- [x] Add explicit safe-consumption guidance: call `dequeue_goal` only after the orchestration item is satisfied; leave it queued when blocked/uncertain.
- [x] Add or update focused probe `/tmp/pi-goal-queue-orchestration-steer-probe.cjs` for non-template steering content.
- [x] Keep existing template steering probe passing.
- [x] Run `npm run quality:goal`.

## Acceptance criteria

- Non-template queue steering content tells the agent the objective may be direct or prose/JIT orchestration.
- Direct queued goals are still guided to `start_queued_goal`.
- Prose/JIT orchestration guidance explicitly says to interpret the queued objective semantically using current context.
- Prose/JIT orchestration guidance explicitly says to use existing goal tools such as `create_goal`, `create_goal_from_template`, and `enqueue_goal` as appropriate.
- Prose/JIT orchestration guidance explicitly says one orchestration item may require one or more consecutive active goals before it is dequeued.
- Prose/JIT orchestration guidance explicitly says to call `dequeue_goal` only after the orchestration item is satisfied, and to leave it queued when blocked or uncertain.
- Implementation does not add extension-side prose parser heuristics.
- Implementation does not add new specialized queue tools for this first pass.
- Template-origin queued goal steering still preserves deterministic template metadata behavior.
- `npm run quality:goal` passes.

## Implementation result

Implemented in this stack by updating `.pi/extensions/goal/queue-steering.ts`.

Summary:

- Added unconditional `queueSteeringContent()` guidance that tells the agent to read the queue head semantically using current context.
- Explicitly distinguishes direct queued goals from prose/JIT orchestration instructions.
- Keeps `start_queued_goal` as the direct-goal atomic path.
- Follow-up hardening after live probe failure changed the steering opener from start-first wording to classify-first wording.
- Updated `start_queued_goal` tool metadata so agents use it only after deciding the queue head is a direct concrete goal.
- Updated `dequeue_goal` tool metadata for prose/JIT orchestration consumption after satisfaction.
- Tells the agent not to start orchestration prose itself as the active goal and not to rely on extension-side parsing.
- Points orchestration handling at existing tools: `create_goal`, `create_goal_from_template`, `enqueue_goal`, and `dequeue_goal`.
- Explicitly allows one prose/JIT orchestration item to require one or more consecutive active goals before it is satisfied.
- Requires leaving the queue item in place until satisfied, then calling `dequeue_goal` exactly once.

Validation passed:

- `npm run typecheck:goal`
- `NODE_PATH=~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-orchestration-steer-probe.cjs`
- `NODE_PATH=~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-template-steer-probe.cjs`
- `NODE_PATH=~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-tool-guidance-probe.cjs`
- `npm run quality:goal`

## Proof threat model

Primary invariant: queued-goal steering must help the agent choose the correct handoff mode for the queue head. Direct queued goals should use `start_queued_goal`; prose/JIT orchestration should be interpreted from current context and remain queued until fully satisfied.

Likely false greens:

- Direct queue handoff still works, but orchestration prose remains under-guided.
- Guidance exists only in the template-metadata branch.
- Guidance tells the agent to dequeue before all needed JIT goal work is complete.
- A parser handles one example phrase but violates flexible-prose behavior.
- New tools solve one case while increasing workflow/tool surface unnecessarily.
- Quality gates pass without checking steering content semantics.

Required proofs below are chosen to fail those false greens.

## TOON synthesis

```toon
toon.version: 1
issue{id,title,status,next_session,goal}:
  "ISSUE-032","Prose queue orchestration guidance","open — execution-ready","focused implementation/probe pass","make queue steering first-class for direct goals and prose/JIT orchestration without parser heuristics or new specialized tools"
locked_requirements[7]{id,requirement}:
  "lr1","queue steering always distinguishes direct queued goals from prose/JIT orchestration possibilities"
  "lr2","direct queued goals remain guided to start_queued_goal"
  "lr3","prose/JIT orchestration is interpreted semantically by the agent using current context"
  "lr4","orchestration uses existing goal tools such as create_goal, create_goal_from_template, enqueue_goal, and dequeue_goal"
  "lr5","one orchestration queue item may require one or more consecutive active goals before dequeue"
  "lr6","dequeue_goal is called only after the orchestration item is satisfied"
  "lr7","extension code does not add brittle prose parser heuristics or unnecessary specialized queue tools"
implementation_surfaces[3]{surface,path,notes}:
  "steering",".pi/extensions/goal/queue-steering.ts","primary queueSteeringContent guidance update"
  "queue_tools",".pi/extensions/goal/queue-tools.ts","existing start_queued_goal, enqueue_goal, and dequeue_goal semantics should remain unchanged unless tiny prompt text adjustments are needed"
  "proofs","/tmp/pi-goal-queue-orchestration-steer-probe.cjs","focused non-template steering content probe to add or update during implementation"
invariants[5]{id,invariant}:
  "inv1","plain queued prose remains flexible and agent-interpreted"
  "inv2","structured template metadata remains deterministic when already present"
  "inv3","FIFO queue state and replay order are unchanged"
  "inv4","queue item is not consumed before successful direct start or completed orchestration handling"
  "inv5","new guidance does not weaken the single-active-goal invariant"
verification_checks[3]{id,check,evidence}:
  "v1","non-template steering contains direct-vs-orchestration and multi-goal-before-dequeue guidance","queue orchestration steer probe"
  "v2","template-origin steering still includes start_queued_goal and create_goal_from_template fallback","template steer probe"
  "v3","extension remains type-safe, structurally healthy, and loadable","npm run quality:goal"
```

## Required proofs

```toon
toon.version: 1
required_proofs[3]{name,source,command,pass_condition,scope,notes}:
  "queue_orchestration_steer_probe","issue doc","NODE_PATH=~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-orchestration-steer-probe.cjs","exit 0; non-template steering includes direct-vs-orchestration guidance, existing-tool guidance, multi-goal-before-dequeue guidance, and no parser or reorder assumptions",run,"focused behavior proof for this issue"
  "queue_template_steer_probe","issue doc","NODE_PATH=~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-template-steer-probe.cjs","exit 0; template-origin steering still includes start_queued_goal and create_goal_from_template fallback",run,"regression proof for template metadata steering"
  "quality_goal","issue doc","npm run quality:goal","exit 0; Sentrux gate/check, slop guard, TypeScript validation, and Pi extension load validation pass",run,"project required quality gate"
```
