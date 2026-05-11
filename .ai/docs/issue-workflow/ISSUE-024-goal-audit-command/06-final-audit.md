# 06 — Final audit

| Requirement | Evidence |
| --- | --- |
| Request parsed | `00-request.md` |
| Protocol read | `01-protocol-read.md` |
| Grounded research | `02-grounded-research.md`, `raw/research-rg.log`, `raw/sentrux-gate.log` |
| Design choice locked | `03-design-lock.md` |
| Proof threat model | `04-proof-threat-model.md` |
| Issue writeback | `05-issue-writeback.md` |
| Canonical issue path | `.ai/issues/open/ISSUE-024-goal-audit-command.md` |
| Required proofs included | `.ai/issues/open/ISSUE-024-goal-audit-command.md` |
| Raw command log | `raw/commands.log` |
| Downstream references updated | `07-downstream-reference-update.md` |
| Closeout summary | `08-closeout-summary.md` |
| Quality gate | `raw/quality-goal-open-promotion.log` (`quality_exit=0` in `raw/commands.log`) |
| Lifecycle/filter recheck | `09-lifecycle-filter-source-recheck.md` |
| Tool output recheck | `10-tool-output-source-recheck.md` |
| Parser reuse note | `11-model-output-parser-reuse-note.md` |
| Validation probe plan | `12-validation-probe-plan.md` |
| README/docs plan | `13-readme-and-docs-plan.md` |
| Queue continuation note | `14-queue-continuation-note.md` |
| Implementation handoff | `15-implementation-handoff.md` |
| Acceptance traceability | `16-acceptance-traceability.md` |
| Non-implementation boundary | `17-nonimplementation-boundary.md` |
| Proof command sanity | `18-proof-command-sanity.md` |
| Current inventory after promotion | `19-current-inventory-after-promotion.md` |
| UI/widget source recheck | `20-ui-widget-source-recheck.md` |
| Queue tools source recheck | `21-queue-tools-source-recheck.md` |
| Audit record schema sketch | `22-audit-record-schema-sketch.md` |
| Prompt contract sketch | `23-prompt-contract-sketch.md` |
| Reference audit | `24-reference-audit.md` |
| Dependency path probe | `25-dependency-path-probe.md` |
| Live probe scope note | `26-live-probe-scope-note.md` |
| Sentrux planning summary | `27-sentrux-planning-summary.md` |
| Quality gate summary | `28-quality-gate-summary.md` |
| Final linkage probe | `29-final-linkage-probe.md` |

## Execution-readiness check

- Meaningful forks are locked: execution shape, command/tool parity, mutation/continuation behavior, persistence, and status eligibility.
- Acceptance criteria and proof rows align to the locked choices.
- The issue does not ask the implementer to decide whether audit should be continuation, monitor, deterministic summary, or auto-completion.
- Runtime implementation was not performed in this issue-doc promotion pass.

## Scope boundary check

After final issue inspection, no omitted objective requirement remains: the canonical issue is in `open`, the old refine copy is removed, visible workflow artifacts are linked through the current artifact list, the proof threat model and `required_proofs[]` block are present, and stale ISSUE-020/ISSUE-024 refine dependency paths were corrected. A redundant pre-steering TOON-shape probe artifact was removed rather than linked because it added no new requirement coverage beyond the existing issue/proof validation. A final stdout-only validation probe passed the main invariant: open issue exists, old refine issue is removed, artifacts `00`-`29` are linked, required proofs are present, and stale ISSUE-024 refine path is absent from the canonical issue.

Research-expansion source check: inspected `.pi/extensions/goal/continuation.ts`. Normal continuation uses `scheduleMaybeContinueGoal()`, then `setNextTurnOrigin("auto")`, and sends `CONTINUATION_MESSAGE_TYPE` with `{ triggerTurn: true, deliverAs: "followUp" }`. This concretely tightened `12-validation-probe-plan.md`: `goal-audit-command-probe.mjs` should fail if `/goal audit` can reach that normal continuation path.

Additional source check: inspected `.pi/extensions/goal/index.ts`. The entrypoint currently wires command/tools to continuation, monitor, budget wrap-up, queue steering, and lifecycle with direct scheduler dependencies. This tightened `15-implementation-handoff.md`: audit should preserve entrypoint simplicity and avoid adding broad continuation-like scheduling dependencies.

Telemetry source check: inspected `.pi/extensions/goal/telemetry.ts`. `resetSafetyCounters()` is resume semantics and `noteContinuationScheduled()` is continuation semantics. This further tightened `15-implementation-handoff.md`: audit must not call either; it should preserve telemetry except optional bounded audit metadata. No further valuable floor work remains for this concrete ISSUE-024 promotion goal.

## Remaining parent orchestration

Parent queue item remains unsatisfied after ISSUE-024 because remaining refine stack items still need promotion:

1. `.ai/issues/refine/ISSUE-022-goal-history-checkpoints-and-compaction.md`
2. `.ai/issues/refine/ISSUE-018-goal-start-in-worktree.md`
3. `.ai/issues/refine/ISSUE-019-parallel-multiple-goals.md`
4. `.ai/issues/refine/ISSUE-023-goal-dependency-triggers-and-watchers.md`
5. `.ai/issues/open/ISSUE-011-goal-widget-real-component-and-narrow-width.md`
6. `.ai/issues/open/ISSUE-014-goal-progress-estimates.md`
7. `.ai/issues/open/ISSUE-013-goal-update-natural-language.md`
