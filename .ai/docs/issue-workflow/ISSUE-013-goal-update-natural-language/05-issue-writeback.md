# 05 — Issue writeback

Issue: ISSUE-013 — `/goal update` natural-language goal updates
Date: 2026-05-10

## Writeback performed

Promoted the refine issue into canonical open-bucket form:

- Source: `.ai/issues/refine/ISSUE-013-goal-update-natural-language.md`
- Target: `.ai/issues/open/ISSUE-013-goal-update-natural-language.md`

The promoted issue now includes:

- execution-ready status and next-session guidance;
- corrected dependency paths;
- links to all required artifacts;
- grounded research findings;
- locked design choices;
- supported grammar and rejection rules;
- implementation checklist;
- acceptance criteria;
- proof threat model;
- TOON synthesis with `required_proofs[8]`.

## Decisions written back

- Deterministic known-field parser only; no model-assisted extraction in first release.
- Every parsed proposal requires confirmation.
- Completion phrases are refused by `/goal update`; completion remains through structured `update_goal(status:"complete")` after audit/gates.
- Objective updates preserve the current `goalId` and do not create a new goal.
- Token and duration literals have explicit syntax and reject ambiguous time integers.
- Progress grammar depends on ISSUE-014 and remains advisory-only.

## Stale dependency cleanup

The promoted issue depends on the fixed ISSUE-010 path:

- `.ai/issues/fixed/ISSUE-010-goal-update-telemetry-completion-semantics.md`

Related open issues use open-bucket paths:

- `.ai/issues/open/ISSUE-014-goal-progress-estimates.md`
- `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`
- `.ai/issues/open/ISSUE-024-goal-audit-command.md`

## Non-implementation note

No code was intentionally changed for ISSUE-013 in this promotion pass. Implementation remains for a future session following the promoted checklist and proofs.
