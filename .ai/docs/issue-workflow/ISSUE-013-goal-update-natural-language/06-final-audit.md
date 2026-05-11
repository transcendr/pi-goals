# 06 — Final audit

Issue: ISSUE-013 — `/goal update` natural-language goal updates
Date: 2026-05-10

## Completion audit

The request was to refine the existing ISSUE-013 refine-bucket planning doc into an execution-ready canonical open-bucket issue, visibly following `$feature-workflow-pipelines`.

Result: complete for the planning/promotion scope.

## Artifacts

Required visible artifacts exist:

- `00-request.md`
- `01-protocol-read.md`
- `02-grounded-research.md`
- `03-design-lock.md`
- `04-proof-threat-model.md`
- `05-issue-writeback.md`
- `06-final-audit.md`
- `raw/commands.log`

Additional raw evidence:

- `raw/pre-refinement-nl-update-invariant-probe.log`
- `raw/research-rg.log`
- `raw/sentrux-gate.log`
- `raw/promotion-invariant-probe.log`
- `raw/quality-goal-open-promotion.log`
- `raw/final-visibility-and-path-checks.log`
- `raw/final-inventory.log`
- `raw/final-comprehensive-completion-probe.log`

## Locked-design audit

The promoted issue locks the required forks:

- deterministic parser rather than model-assisted extraction;
- explicit trust boundary: local parser, no hidden model extraction, no objective-as-prompt parsing;
- confirmation UX for every successful parse;
- completion restriction: `/goal update` refuses completion phrases in first pass;
- objective edits preserve existing goal identity rather than replacing the goal;
- token and duration literal syntax with ambiguity rejection;
- progress handling follows ISSUE-014 advisory semantics only.

## Proof/readiness audit

The promoted issue includes:

- proof threat model;
- TOON synthesis;
- `required_proofs[8]` covering parser, confirmation, budget literals, objective identity, completion refusal, progress advisory behavior, `npm run quality:goal`, and final diff/status checks;
- implementation checklist and acceptance criteria;
- dependency cleanup to fixed/open issue paths.

## Validation evidence

- `raw/promotion-invariant-probe.log`: PASS for open issue, removed refine issue, design locks, progress dependency, and required proof shape.
- `raw/sentrux-gate.log`: `sentrux gate --save .pi/extensions/goal` exited `0`.
- `raw/quality-goal-open-promotion.log`: `npm run quality:goal` exited `0`.
- `raw/final-visibility-and-path-checks.log`: artifact visibility check recorded `git status --short --untracked-files=all`, `git check-ignore -v`, and `git diff --check` with `diff_check_exit=0`.
- `raw/final-inventory.log`: refine bucket has no remaining issue files; open bucket contains ISSUE-013 alongside the previously promoted stack issues.
- `raw/final-comprehensive-completion-probe.log`: PASS for artifact existence/linkage, quality/Sentrux evidence, design locks, TOON proof shape, and absence of external stale refine references.

## Live probe scope

Skipped live probe for this planning-only promotion because no slash-command runtime behavior was changed. The promoted issue requires a live probe or explicit deterministic-coverage rationale during implementation, because actual implementation will change `/goal update` command behavior.

## Queue/stack note

ISSUE-013 is now promoted and execution-ready. It was the remaining refine-bucket item in the current open-promotion stack.
