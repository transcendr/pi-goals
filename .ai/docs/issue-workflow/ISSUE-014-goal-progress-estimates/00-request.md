# 00 — Request transcript

Issue: ISSUE-014 — agent-estimated goal progress percentage
Date: 2026-05-10

## User request

Refine `.ai/issues/refine/ISSUE-014-goal-progress-estimates.md` until it is execution-ready per `$feature-workflow-pipelines`, then promote the canonical issue doc to `.ai/issues/open/`.

## Parsed inputs

- target bucket: `open`
- issue kind: `feature`
- requested title: `agent-estimated goal progress percentage`
- source issue: `.ai/issues/refine/ISSUE-014-goal-progress-estimates.md`
- target issue path: `.ai/issues/open/ISSUE-014-goal-progress-estimates.md`
- transcript artifact directory: `.ai/docs/issue-workflow/ISSUE-014-goal-progress-estimates/`

## Stack context

This is item 10 in `.ai/docs/issue-workflow/refine-issue-leverage-order-2026-05-10/final-order.md`.

Previous stack items through ISSUE-011 are now promoted to `.ai/issues/open/`. ISSUE-014 depends on the promoted widget strategy issue:

- `.ai/issues/open/ISSUE-011-goal-widget-real-component-and-narrow-width.md`

## Required design inputs

ISSUE-014 must use ISSUE-011's locked widget strategy:

- progress rendering must respect the framed/compact split;
- progress must stay hidden by default when unused;
- progress must not reintroduce “card” component assumptions;
- progress estimates must remain advisory and must not weaken completion proofs/audits.

## Initial validation expansion

Per completion-floor steering, the first concrete action was a targeted invariant probe:

- failed first pass: `raw/pre-refinement-progress-invariant-probe.log` (caught a too-broad search term because `widget.ts` has a budget `progressBar` helper)
- corrected pass: `raw/pre-refinement-progress-invariant-probe-v2.log`

The corrected probe confirms the main planning invariant: current runtime has no progress estimate fields in `GoalState`, `update_goal`, or widget rendering, while ISSUE-011 provides the required widget layout constraints.
