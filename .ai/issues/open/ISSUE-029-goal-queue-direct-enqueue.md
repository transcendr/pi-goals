# ISSUE-029 — Queue subcommand should enqueue directly

Status: open — execution-ready
Priority: P1
Owner: unassigned
Created: 2026-05-09
Next best session: focused implementation/validation pass for `/goal queue <text>` dispatch
Next best session rationale: Research isolated the bug to first-token command parsing in `.pi/extensions/goal/command.ts`; existing queue handler can be reused.
Target bucket: open
Issue kind: fix
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-027-goal-queue.md`
Related:
- `.ai/issues/open/ISSUE-028-goal-replacement-preview.md`

## Goal

Make `/goal queue <text/template>` directly enqueue the provided resolved objective without showing Replace/Queue/Cancel.

## Problem/context

The explicit queue subcommand is intended to mean "put this goal in the queue." When a user enters:

```text
/goal queue <text>
```

it should not behave like normal `/goal <text>` and ask whether to Replace, Queue, or Cancel. The command itself already chose Queue.

Current behavior still presents Replace/Queue/Cancel when a goal exists.

## Transcript artifacts

- Request intake: `.ai/docs/issue-workflow/ISSUE-029-goal-queue-direct-enqueue/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-029-goal-queue-direct-enqueue/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-029-goal-queue-direct-enqueue/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-029-goal-queue-direct-enqueue/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-029-goal-queue-direct-enqueue/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-029-goal-queue-direct-enqueue/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-029-goal-queue-direct-enqueue/06-final-audit.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-029-goal-queue-direct-enqueue/raw/commands.log`

## Research findings

- `GOAL_SUBCOMMANDS` includes `queue`.
- `handleQueueCommand()` already supports no-text listing and trailing-text enqueue behavior.
- `handleGoalCommand()` currently recognizes subcommands only when the full trimmed input exactly equals a subcommand name.
- Therefore `queue <text>` is not recognized as the queue subcommand and falls through to normal goal creation.
- Normal goal creation sees the existing goal and shows Replace/Queue/Cancel.

## Locked design choices

- Parse the first token as the subcommand discriminator.
- If the first token is `queue`, always dispatch to `handleQueueCommand(pi, trimmed, ctx)` whether or not trailing text exists.
- Keep `/goal queue` list behavior unchanged.
- Keep `/goal queue <template invocation>` resolving the template before enqueueing.
- Never call `setGoalObjective()` for queue subcommand invocations.

Rejected alternatives:
- Special casing inside `setGoalObjective()`: mixes parsing with creation and could misclassify real objectives.
- Requiring `/goal queue -- <text>`: too formal and not the intended user surface.

## Implementation checklist

- [ ] Update `handleGoalCommand()` subcommand parsing to route `queue` by first token.
- [ ] Preserve exact handling for `pause`, `resume`, and `clear` unless their no-args-only behavior is intentional.
- [ ] Add focused dispatch probe `/tmp/pi-goal-queue-direct-enqueue-probe.cjs`.
- [ ] Assert no `ctx.ui.select()` call occurs for `/goal queue <text>` with an active goal.
- [ ] Run `npm run quality:goal`.

## Acceptance criteria

- `/goal queue` with no extra text lists the queue.
- `/goal queue <freeform objective>` enqueues directly and does not present Replace/Queue/Cancel.
- `/goal queue <template invocation>` enqueues the resolved template objective directly.
- Active current goal remains unchanged after direct enqueue.

## Proof threat model

Primary invariant: explicit queue subcommand invocations with trailing text enqueue directly and bypass replacement UI.

False greens:
- Probe bypasses command dispatch.
- Probe does not run with an active existing goal.
- Probe fails to assert `ctx.ui.select()` was not called.
- Template path queues raw invocation instead of resolved prompt.

## Required proofs

required_proofs[2]{name,command,condition}:
  queue_direct_enqueue_probe,"NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-direct-enqueue-probe.cjs","exit 0; /goal queue text dispatch enqueues directly without select prompt"
  quality_goal,"npm run quality:goal","exit 0; Sentrux slop TypeScript and Pi load gates pass"
