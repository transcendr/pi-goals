# 06 — Final audit

| Requirement | Evidence |
| --- | --- |
| Request parsed | `00-request.md` |
| Protocol read | `01-protocol-read.md` |
| Grounded research | `02-grounded-research.md`, `raw/sentrux-gate.log` |
| Design choice locked | `03-design-lock.md` |
| Proof threat model | `04-proof-threat-model.md` |
| Issue writeback | `05-issue-writeback.md` |
| Canonical issue path | `.ai/issues/open/ISSUE-016-goal-idle-tolerant-mode.md` |
| Required proofs included | `.ai/issues/open/ISSUE-016-goal-idle-tolerant-mode.md` |
| Raw commands | `raw/commands.log` |

## Completion notes

- The design is execution-ready for a bounded first pass: optional top-level continuation policy, `idle_nudge` delayed reassessment, `manual` no-auto mode, active-not-paused semantics, model tools first, and deterministic probes.
- Runtime implementation was not performed in this issue-doc promotion pass.

## Promotion addendum

Additional handoff/validation artifacts:

- `07-downstream-reference-update.md`: updates leverage-order references to the open path.
- `08-implementation-handoff.md`: summarizes first-pass scope and high-risk continuation seam.
- `09-state-and-telemetry-plan.md`: locks replay defaults and telemetry caveats.
- `10-validation-probe-plan.md`: outlines deterministic probes.
- `11-ui-wording-plan.md`: defines compact active-waiting wording.
- `12-non-implementation-boundary.md`: marks future implementation deliverables.
- `13-queue-continuation-note.md`: records next stack item.
- `14-package-script-proof-check.md`: records slop/typecheck evidence.
- `15-final-promotion-invariant.md`: records final invariant probe.
- `16-closeout-summary.md`: records final validation evidence, inventories, and next stack item.
- `17-telemetry-source-recheck.md`: rechecks telemetry and warns not to count suppressed immediate continuation as scheduled.
- `18-command-source-recheck.md`: rechecks slash command behavior and supports model-tools-first scope.
- `19-tool-output-source-recheck.md`: rechecks tool output and confirms policy details are absent today.
- `20-template-source-recheck.md`: rechecks template resolution and confirms runtime policy should remain tool metadata, not template body text.
- `21-monitor-prompt-recheck.md`: rechecks churn monitor prompt and confirms idle wait context must be added.
- `22-queue-steering-recheck.md`: rechecks queue steering and confirms idle waiting is active-goal continuation state, not queue state.
- `23-floor-source-recheck.md`: rechecks floor evaluation and confirms idle policy should not reuse floor fields.
- `24-readme-update-plan.md`: rechecks README and records documentation requirements after implementation.
- `25-validation-script-plan.md`: inventories current validation scripts and names required idle-policy probe coverage.
- `26-proof-command-normalization.md`: confirms package quality script and proof command expectations for the executor.
- `27-entrypoint-and-schema-recheck.md`: rechecks entrypoint, types, and tool schemas for idle policy integration seams.
- `28-state-replay-source-recheck.md`: rechecks state replay and locks explicit idle-policy normalization requirement.
- `29-ui-widget-format-recheck.md`: rechecks UI/widget/format strings and locks compact active-waiting rendering requirements.
- `30-final-readback.md`: records final canonical path, invariant summary, and next stack item.
- `31-monitor-report-source-recheck.md`: rechecks monitor report builder and locks explicit idle/wait monitor context.
- `32-downstream-stale-reference-fix.md`: records downstream ISSUE-023 dependency reference update from refine path to open path.
- `33-stack-inventory-after-promotion.md`: records remaining refine-stack inventory and confirms parent queue item is not yet satisfied.
- `34-goal-completion-readiness.md`: records final concrete-goal satisfaction checklist before completing the active goal.
- `35-final-diff-snapshot.md`: records relevant tracked diff snapshot and confirms no implementation source files were changed for this planning goal.
- `36-nonimplementation-final-audit.md`: reaffirms planning-only boundary and names intentionally changed/non-changed file classes.
- `37-artifact-link-check.md`: records final check that numbered artifacts 00-36 exist and are linked from the open issue.

## Final visibility check

Per churn-monitor steering, no further micro-audit artifacts are needed. Final focused checks were run directly:

- `git status --short --untracked-files=all`: shows the ISSUE-016 open issue, visible `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/**` artifacts, deletion of the old refine ISSUE-016 file, and the ISSUE-023 dependency reference update.
- `git check-ignore -v .ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/00-request.md || true`: returned `.gitignore:11:!.ai/docs/issue-workflow/**`, confirming workflow artifacts are explicitly unignored/visible.
- Link-existence check: PASS; required artifacts `00-request.md` through `06-final-audit.md` plus `raw/commands.log` exist and are linked from `.ai/issues/open/ISSUE-016-goal-idle-tolerant-mode.md`.
- `git diff --check`: PASS with no whitespace/error output.

Research-expansion source check: direct `.gitignore` inspection confirms `.ai/docs/*` is ignored by default but `.ai/docs/issue-workflow/` and `.ai/docs/issue-workflow/**` are explicitly unignored, matching the `git check-ignore` visibility result.

Validation-expansion probe: a targeted Node probe passed `open_issue_exists`, `refine_issue_absent`, required artifact `linked_and_exists` checks for `00`-`06` plus `raw/commands.log`, and `execution_ready_status`. This covers the main promotion invariant: the canonical issue is open/execution-ready, the old refine copy is gone, and the required workflow evidence exists and is linked.

Completion judgment: ISSUE-016 is execution-ready in `.ai/issues/open`; the concrete active goal can be marked complete when the floor gate permits.
