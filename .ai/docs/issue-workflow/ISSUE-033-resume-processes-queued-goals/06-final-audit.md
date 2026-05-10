# 06 — Final audit

## Compliance matrix

| Requirement | Evidence | Status |
| --- | --- | --- |
| Parsed request captured | `00-request.md` | pass |
| Full workflow docs read or freshly present | `01-protocol-read.md` | pass |
| Grounded live-code research performed | `02-grounded-research.md`, `raw/commands.log` | pass |
| Design choice locked | `03-design-lock.md` | pass |
| Proof threat model created | `04-proof-threat-model.md` | pass |
| Canonical issue written | `.ai/issues/open/ISSUE-033-resume-processes-queued-goals.md` | pass |
| Artifact links included in issue | issue `Grounded research findings` section | pass |
| TOON synthesis included | issue `TOON synthesis` section | pass |
| `required_proofs[]` included | issue `required_proofs[]` section | pass |
| Artifact visibility verified | `git status --short --untracked-files=all`; `git check-ignore -v ... || true` | pass |

## Visibility verification

`git status --short --untracked-files=all` showed the issue doc and workflow artifacts as untracked/trackable.

`git check-ignore -v .ai/docs/issue-workflow/ISSUE-033-resume-processes-queued-goals/00-request.md || true` reported the explicit unignore rule:

```text
.gitignore:8:!.ai/docs/issue-workflow/** .ai/docs/issue-workflow/ISSUE-033-resume-processes-queued-goals/00-request.md
```

## Remaining notes

The worktree also contains unrelated untracked `.ai/.pi-goals/release-readme-review.md`; it was not included in this issue-doc artifact set.
