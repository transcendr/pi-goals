# ISSUE-028 — Show resolved goal text before replacement choice

Status: fixed — implemented
Priority: P1
Owner: pi-goal automation
Created: 2026-05-09
Next best session: none — fixed for `/goal` replacement prompt regression
Next best session rationale: The regression is isolated to the existing-goal decision path in `.pi/extensions/goal/command.ts`; implementation can be small and probe-driven.
Target bucket: fixed
Issue kind: fix
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-027-goal-queue.md`
Related:
- `.ai/issues/fixed/ISSUE-017-reusable-goal-prompt-docs.md`
- `.ai/issues/fixed/ISSUE-026-nl-reusable-goal-prompts.md`

## Goal

Restore the resolved candidate goal preview when `/goal <text/template>` is submitted while a current goal exists, before the user chooses Replace, Queue, or Cancel.

## Problem/context

Before the queue work, entering `/goal <template> ...args` while another goal existed showed the fully resolved template prompt/objective above the selectable replacement options. That was useful because reusable prompt expansion can produce a long objective, and the user needs to inspect the actual candidate goal before replacing the current one.

The current behavior only shows a generic selection prompt:

```ts
ctx.ui.select("Goal already active. Choose action:", ["Replace", "Queue", "Cancel"])
```

That loses the resolved objective preview.

## Transcript artifacts

- Request intake: `.ai/docs/issue-workflow/ISSUE-028-goal-replacement-preview/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-028-goal-replacement-preview/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-028-goal-replacement-preview/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-028-goal-replacement-preview/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-028-goal-replacement-preview/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-028-goal-replacement-preview/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-028-goal-replacement-preview/06-final-audit.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-028-goal-replacement-preview/raw/commands.log`

## Research findings

- `.pi/extensions/goal/command.ts` resolves reusable templates before calling `setGoalObjective()`.
- `setGoalObjective()` validates the resolved objective before checking for an existing goal.
- The existing-goal branch now builds choices `["Replace", "Queue", "Cancel"]` and passes only a generic prompt to `ctx.ui.select()`.
- The resolved candidate objective is available as `validation.objective` at the decision point but is not rendered.
- `.pi/extensions/goal/ui.ts` has notification helpers, but the decision prompt itself is the right place for this preview.

## Locked design choices

- Include the resolved candidate objective directly in the `ctx.ui.select()` prompt shown before Replace/Queue/Cancel.
- Show the post-template, post-inline-command, validated objective text, not the raw slash invocation.
- Preserve all three choices: Replace, Queue, Cancel.
- Use deterministic truncation only if necessary, with a visible truncation marker.

Rejected alternatives:
- Separate notification before select: easier to miss and not literally above selectable options.
- Removing Queue to restore old behavior: rejects the queue feature instead of fixing the regression.

## Implementation checklist

- [ ] Add a small formatter/helper for replacement candidate preview if useful.
- [ ] Update `setGoalObjective()` existing-goal branch to include `validation.objective` in the select prompt.
- [ ] Preserve Queue and Cancel behavior.
- [ ] Add focused probe `/tmp/pi-goal-replacement-preview-probe.cjs` that captures the select prompt.
- [ ] Run `npm run quality:goal`.

## Acceptance criteria

- Existing current goal + `/goal <template> ...args` shows the fully resolved candidate objective before the Replace/Queue/Cancel choice.
- Existing current goal + `/goal <freeform text>` shows the candidate freeform objective before the same choice.
- Queue and Cancel remain available and behave as before.
- Existing template resolution behavior is unchanged.

## Proof threat model

Primary invariant: the replacement decision UI includes the actual resolved candidate goal objective before the user chooses what to do with it.

False greens:
- Test only sees choices but not prompt text.
- Prompt contains raw template syntax rather than resolved objective.
- Preview works for freeform but not templates.
- Queue option regresses while restoring preview.

## Implementation result

Implemented in commit `8ed0f47 fix: repair queued goal command flow`.

Validation passed for this issue as part of the ISSUE-028..031 stack:

- `NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-replacement-preview-probe.cjs`
- `NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-direct-enqueue-probe.cjs`
- `NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-completion-steer-probe.cjs`
- `NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-template-steer-probe.cjs`
- `NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-template-autocomplete-probe.cjs`
- `npm run quality:goal`

## Required proofs

required_proofs[2]{name,command,condition}:
  replacement_preview_probe,"NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-replacement-preview-probe.cjs","exit 0; select prompt includes resolved objective preview and still offers Replace Queue Cancel"
  quality_goal,"npm run quality:goal","exit 0; Sentrux slop TypeScript and Pi load gates pass"
