# 17 — Closeout snapshot

## Deliverables completed

- Refined canonical issue originally at `.ai/issues/refine/ISSUE-021-goal-completion-proofs.md`; later promoted canonical issue to `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`.
- Created required workflow artifacts `00` through `06`.
- Added supporting execution-readiness artifacts `07` through `23`, including tool API design, proof evaluator API, UI/README plans, validation probe design, and worktree freshness design.
- Added promotion/readiness artifacts `24` through `27` for open-bucket promotion, migration consistency, current code readiness, and downstream reference updates.
- Captured raw logs for command transcript, validation expansion probe, path existence audit, diff check, open promotion validation, and downstream reference checks.

## Key validation evidence

- `raw/validation-expansion-probe.log`: dynamic issue-doc workflow invariant probe passes.
- `raw/open-promotion-validation.log`: open-bucket promotion invariants pass.
- `raw/open-issue-full-validation.log`: canonical open issue has required front matter, sections, artifact links, proof rows, and implementation surfaces.
- `raw/open-path-audit.log`: canonical open issue references resolve or are explicitly classified as future proof/implementation deliverables.
- `raw/path-existence-audit.log`: original refinement path audit passed before promotion.
- `raw/diff-check.log`: `git diff --check` produced no whitespace errors.
- `sentrux gate .pi/extensions/goal`: no structural degradation, Quality `6241 -> 6241`.

## Files inspected for grounding

- Goal runtime/completion: `types.ts`, `state.ts`, `tools.ts`, `completion-gate.ts`, `tool-results.ts`, `prompts.ts`, `monitor-prompts.ts`, `monitor-report.ts`, `monitor.ts`, `constants.ts`, `templates.ts`, `model-output.ts`, `command.ts`, `queue-tools.ts`, `budget.ts`, `format.ts`, `widget.ts`, `ui.ts`, `telemetry.ts`.
- Pi extension API/examples: `dist/core/exec.d.ts`, `examples/extensions/inline-bash.ts`.
- Related issues: ISSUE-010, ISSUE-015, ISSUE-020, ISSUE-022, ISSUE-023, ISSUE-024, ISSUE-036, ISSUE-037.
- Project config: `package.json`, `.gitignore`.

## Remaining unresolved questions

None blocking issue execution. Implementation details intentionally deferred to the executor:

- whether first runner uses `pi.exec` directly or a small shell wrapper;
- how much `worktree_status` freshness lands in the first commit versus a follow-up.

Resolved during follow-up work:

- first release should use model tools, not `/goal proof` slash commands;
- proof gates should include a trusted `source` field;
- raw `goal.updatedAt` must not be used as the freshness key because accounting updates it every turn;
- proof result retention must be trimmed before persistence;
- `worktree_status` freshness should use the post-proof git status fingerprint for the resolved cwd.
