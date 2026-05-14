# ISSUE-030 — Start queued goals via steering after completion

Status: fixed — implemented
Priority: P1
Owner: pi-goal automation
Created: 2026-05-09
Next best session: none — fixed for queue completion steering
Next best session rationale: Queue persistence and manual queue tools exist; missing behavior is isolated to completion/clear handoff and steering prompt construction.
Target bucket: fixed
Issue kind: feature
Target repo roots: `~/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-027-goal-queue.md`
Related:
- `.ai/issues/open/ISSUE-029-goal-queue-direct-enqueue.md`
- `.ai/issues/fixed/ISSUE-026-nl-reusable-goal-prompts.md`

## Goal

When the current goal completes or is cleared and queued goals exist, inject an agent-visible steering message that presents the next queued goal and instructs the agent to continue immediately by creating it.

## Problem/context

ISSUE-027 added a persisted FIFO goal queue and manual queue tools. However, when a current active goal is completed, the agent can simply stop. It is not automatically made aware that a queued goal exists or that it should continue by starting the next one.

The queue should behave like an autonomous continuation handoff: after completion/clear, the next queued goal is surfaced in agent context with actionable instructions.

A special requirement applies to queued template/prompt requests: if a queued item came from a reusable prompt/template, the steering must tell the agent to use `create_goal_from_template` instead of plain `create_goal` so deterministic template behavior, placeholder validation, inline-command policy, and metadata are preserved.

## Transcript artifacts

- Request intake: `.ai/docs/issue-workflow/ISSUE-030-queued-goal-steering/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-030-queued-goal-steering/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-030-queued-goal-steering/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-030-queued-goal-steering/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-030-queued-goal-steering/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-030-queued-goal-steering/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-030-queued-goal-steering/06-final-audit.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-030-queued-goal-steering/raw/commands.log`

## Research findings

- Queue state exists in `.pi/extensions/goal/queue-state.ts` and is replayed in lifecycle.
- Manual queue tools exist in `.pi/extensions/goal/queue-tools.ts`.
- `clearGoal()` in `command.ts` and `clear_goal` in `tools.ts` currently only return/notify queue hints.
- `handleTurnEnd()` in `lifecycle.ts` tracks goal completion through `activeTurn.completedGoal`, but no queue handoff occurs when a goal becomes complete.
- Existing steering mechanisms use `pi.sendMessage(..., { deliverAs: "steer" })`.
- Queued goal type already includes optional template metadata fields, but enqueue paths may need to populate them for template-origin requests.

## Locked design choices

- Inject a hidden steering message rather than auto-creating the next goal inside the extension.
- Fire the steering after current goal completion and after explicit clear when the queue is non-empty.
- Do not dequeue merely because the steering was sent; keep the queued item until the agent/tool path explicitly consumes it or implementation provides an atomic create-from-queue path.
- Include queue id, objective, budgets, and template metadata/instructions in the steering content.
- If template metadata exists, explicitly instruct `create_goal_from_template` with template/flags/args instead of `create_goal`.
- Add a distinct queue-steering prompt/message id for tests and future filtering.

Rejected alternatives:
- Auto-create the next goal directly: too much implicit mutation and risks bypassing template tool semantics.
- UI-only notification: does not reliably inform the agent context.
- Dequeue-on-steer: can lose queued work if creation fails.

## Implementation checklist

- [ ] Add queue steering prompt builder/helper.
- [ ] Add constants/message details for queue steering.
- [ ] Hook queue steering after goal completion in lifecycle turn-end handling.
- [ ] Hook queue steering after command/tool clear paths when queue is non-empty.
- [ ] Preserve queued item until explicit dequeue/create consumption.
- [ ] Ensure template-origin queue items carry metadata where possible.
- [ ] Add focused probes for completion steering and template-origin steering.
- [ ] Run `npm run quality:goal`.

## Acceptance criteria

- Completing a current goal while the queue is non-empty injects a hidden steering message with `deliverAs: "steer"`.
- Clearing a current goal while the queue is non-empty injects equivalent steering or otherwise places the next queued goal in agent context immediately.
- Steering includes next queue id and objective.
- Template-origin queued goals steer the agent to `create_goal_from_template`, not `create_goal`.
- Queue item is not lost merely because steering was injected.
- No steering is injected when the queue is empty.

## Proof threat model

Primary invariant: queued work becomes agent-actionable immediately after the current goal completes or is cleared.

False greens:
- UI hint exists but no agent-context steering exists.
- Steering content omits the actual next queued goal.
- Template-origin requests are restarted with plain `create_goal`.
- Queue item is removed before successful next-goal creation.
- Steering repeats every turn after completion.

## Implementation result

Implemented in commit `8ed0f47 fix: repair queued goal command flow`.

Validation passed for this issue as part of the ISSUE-028..031 stack:

- `NODE_PATH=~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-replacement-preview-probe.cjs`
- `NODE_PATH=~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-direct-enqueue-probe.cjs`
- `NODE_PATH=~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-completion-steer-probe.cjs`
- `NODE_PATH=~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-template-steer-probe.cjs`
- `NODE_PATH=~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-template-autocomplete-probe.cjs`
- `npm run quality:goal`

## Required proofs

required_proofs[3]{name,command,condition}:
  queue_completion_steer_probe,"NODE_PATH=~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-completion-steer-probe.cjs","exit 0; completion with queued goal injects steer message with queue id objective and no dequeue"
  queue_template_steer_probe,"NODE_PATH=~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-template-steer-probe.cjs","exit 0; template-origin queued goal steering explicitly instructs create_goal_from_template"
  quality_goal,"npm run quality:goal","exit 0; Sentrux slop TypeScript and Pi load gates pass"
