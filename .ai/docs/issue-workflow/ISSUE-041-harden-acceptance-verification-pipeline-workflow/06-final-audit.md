# 06 — Final audit

## Protocol compliance matrix

```toon
toon.version: 1
compliance[11]{id,requirement,status,evidence}:
  "c1","Create issue via create-issue-doc protocol","pass","active goal created from .ai/.pi-goals/create-issue-doc.md"
  "c2","Read AGENTS and feature-workflow references","pass","01-protocol-read.md lists AGENTS.md, feature-workflow SKILL, four references, and AXI"
  "c3","Create visible transcript artifact directory","pass",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/ exists"
  "c4","Write 00 request intake artifact","pass","00-request.md"
  "c5","Write 01 protocol-read artifact","pass","01-protocol-read.md"
  "c6","Run grounded research and write artifact","pass","02-grounded-research.md plus raw/commands.log"
  "c7","Run design-locking pass and write artifact","pass","03-design-lock.md"
  "c8","Write proof threat model","pass","04-proof-threat-model.md"
  "c9","Write canonical issue doc after research/design artifacts","pass",".ai/issues/open/ISSUE-041-harden-acceptance-verification-pipeline-workflow.md"
  "c10","Write issue writeback artifact","pass","05-issue-writeback.md"
  "c11","Verify visibility/ignore status","pass","git status shows issue/artifacts as untracked; check-ignore shows issue doc unignored and workflow artifact matched by negation exception"
```

## Artifact inventory

```toon
artifacts[9]{id,path,status}:
  "a1",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/00-request.md","created"
  "a2",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/01-protocol-read.md","created"
  "a3",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/02-grounded-research.md","created"
  "a4",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/03-design-lock.md","created"
  "a5",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/04-proof-threat-model.md","created"
  "a6",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/05-issue-writeback.md","created"
  "a7",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/06-final-audit.md","created"
  "a8",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/07-followup-rerun-observation.md","created"
  "a9",".ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/raw/commands.log","created"
```

## Visibility check

Commands run and appended to `raw/commands.log`:

```bash
git status --short --untracked-files=all
git check-ignore -v .ai/docs/issue-workflow/ISSUE-041-harden-acceptance-verification-pipeline-workflow/00-request.md || true
git check-ignore -v .ai/issues/open/ISSUE-041-harden-acceptance-verification-pipeline-workflow.md || true
rg -n "required_proofs\[7\]|point_resolution\[4\]|acceptance_template_contract_probe|budget_limited_queue_handoff_probe" .ai/issues/open/ISSUE-041-harden-acceptance-verification-pipeline-workflow.md
```

Result summary:

- `git status --short --untracked-files=all` lists the ISSUE-041 issue doc and workflow artifacts.
- `git check-ignore -v` for `00-request.md` reports `.gitignore:11:!.ai/docs/issue-workflow/**`, the existing negation rule that makes workflow artifacts visible despite broader `.ai` ignore patterns.
- `git check-ignore -v` for the issue doc emits no ignore match.
- `rg` confirms the issue doc contains the required proof and cascading-rationale TOON blocks.
- Follow-up update added `07-followup-rerun-observation.md` and updated ISSUE-041 with no-batch mid-run drift plus strong worker profile/model requirements.

## Final issue status

The issue is `open — execution-ready`. It documents each user-reported remediation point plus the follow-up rerun observation, maps cascading symptoms to root causes, locks runtime/template/model-profile fix directions, and requires both deterministic and live proofs.
