# 06 — Final audit for ISSUE-018

## Completion standard audit

| Requirement | Evidence | Status |
| --- | --- | --- |
| Requested issue doc exists in requested bucket | `.ai/issues/open/ISSUE-018-goal-start-in-worktree.md` | pass |
| Existing refine issue promoted/removed | `.ai/issues/refine/ISSUE-018-goal-start-in-worktree.md` removed; path probe in `raw/final-validation.log` | pass |
| Request intake artifact exists | `00-request.md` | pass |
| Protocol read artifact exists | `01-protocol-read.md` | pass |
| Grounded research artifact exists | `02-grounded-research.md` | pass |
| Design lock artifact exists | `03-design-lock.md` | pass |
| Proof threat model artifact exists | `04-proof-threat-model.md` | pass |
| Issue writeback artifact exists | `05-issue-writeback.md` | pass |
| Raw command transcript exists | `raw/commands.log` | pass |
| Issue links to transcript artifacts | `raw/final-validation.log` required proof/artifact probe: `PASS issue018_required_proofs_and_artifacts rows=7` | pass |
| Artifacts visible to git/status review | `raw/final-validation.log` status section lists issue/artifacts as untracked/deleted changes | pass |
| Artifact not hidden by ignore rules | `git check-ignore -v .../00-request.md` reports `.gitignore` unignore rule `!.ai/docs/issue-workflow/**` | pass |
| Required proof TOON block present | `.ai/issues/open/ISSUE-018-goal-start-in-worktree.md` has `required_proofs[7]` | pass |
| Design forks locked | `03-design-lock.md` locks command/tool, creation owner, session handoff, naming, dirty source, cleanup, and ISSUE-019 boundary | pass |
| Targeted invariant probe run | `raw/issue018-invariant-probe.log` contains `PASS issue018_invariant_probe safe_worktree_design_locked` | pass |
| Quality/sensor gate run | `raw/sentrux-gate.log` exit `0`; `raw/quality-goal-open-promotion.log` has `quality_goal_exit=0` | pass |

## Prompt-to-artifact checklist

- Use `$feature-workflow-pipelines`: `01-protocol-read.md`; resulting artifacts `00` through `06`.
- Use `$axi` for agent-facing command/tool ergonomics: `01-protocol-read.md`; command/tool output consequences in `03-design-lock.md` and issue doc.
- Use `$sentrux` for architecture-sensitive planning: `raw/sentrux-gate.log` and `raw/quality-goal-open-promotion.log`.
- Inspect files directly before writing final issue: `02-grounded-research.md` and `raw/commands.log`.
- Move canonical issue from refine to open: `05-issue-writeback.md`; path probe in `raw/final-validation.log`.
- Preserve/link artifacts: transcript artifact list in issue doc; required probe in `raw/final-validation.log`.
- Include proof threat model and required proofs: `04-proof-threat-model.md`; issue doc sections `Proof threat model` and `Required proofs`.
- Resolve stale dependency paths: `05-issue-writeback.md`; `raw/stale-reference-audit.log` shows no remaining non-raw references to `.ai/issues/refine/ISSUE-018-goal-start-in-worktree.md`.

## Validation summary

- `sentrux gate --save .pi/extensions/goal`: exit `0`, quality `6241`.
- `npm run quality:goal`: exit `0`.
- `git diff --check`: exit `0`.
- Promotion path probe: open path exists and refine path absent.
- Required proof/artifact link probe: `PASS issue018_required_proofs_and_artifacts rows=7`.
- Worktree design invariant probe: final rerun passed after correcting the probe's case-sensitive expected text.
- Artifact visibility check: status lists `.ai/docs/issue-workflow/ISSUE-018-goal-start-in-worktree/**` as visible untracked files; check-ignore shows explicit unignore rule.

## Live probe scope

No live Pi runtime probe was run because this pass created/promoted an issue doc and did not change runtime behavior. The promoted issue requires a future `live_disposable_worktree_probe` for implementation because the core behavior involves real Git worktree creation and cleanup.

## Unresolved questions

No owner/product questions remain for first-pass implementation. Future enhancements intentionally deferred to ISSUE-019 include automatic multi-agent spawning, parallel spend controls, and aggregate multi-goal UI.
