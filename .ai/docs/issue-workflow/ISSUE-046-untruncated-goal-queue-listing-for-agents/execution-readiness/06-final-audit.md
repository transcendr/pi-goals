# 06 Final Audit — ISSUE-046

## Objective restatement

Create an execution-ready issue doc in `/Users/bryan/dev/personal/experiments/pi-goals` under `.ai/issues/open` for the fix titled `Untruncated goal queue listing for agents`, with visible feature-workflow transcript artifacts, grounded research, locked design choices, proof threat model, TOON/required proofs, and artifact visibility checks.

## Prompt-to-artifact checklist

| Requirement | Evidence | Status |
|---|---|---|
| target repo is `pi-goals` | `00-request.md`; issue `Target repo roots` | pass |
| bucket is `open` | issue path `.ai/issues/open/ISSUE-046-...md` | pass |
| issue kind is `fix` | issue front matter | pass |
| title matches request | issue title | pass |
| protocol docs read | `01-protocol-read.md` | pass |
| AXI considered for agent-facing output | `01-protocol-read.md`; issue design choices | pass |
| live code inspected | `02-grounded-research.md`; `raw/commands.log` | pass |
| Pinotator truncation evidence included | issue Problem/context; `02-grounded-research.md`; `raw/commands.log` | pass |
| design locks API/tool output shape | `03-design-lock.md`; issue Locked design choices | pass |
| backward compatibility covered | issue Desired behavior, Locked design choices, Acceptance criteria, proofs | pass |
| token-safety tradeoff covered | issue Desired behavior, Locked design choices, TOON invariants | pass |
| acceptance tests/proofs included | issue Acceptance criteria and Required proofs | pass |
| all required artifacts exist | artifact checklist below | pass |
| issue links every artifact | issue `Transcript artifacts` section | pass |
| TOON blocks valid | `raw/commands.log`; validation output | pass |
| artifact visibility verified | git status and check-ignore output in `raw/commands.log` | pass |

## Artifact checklist

| Artifact | Status |
|---|---|
| `00-request.md` | present |
| `01-protocol-read.md` | present |
| `02-grounded-research.md` | present |
| `03-design-lock.md` | present |
| `04-proof-threat-model.md` | present |
| `05-issue-writeback.md` | present |
| `06-final-audit.md` | present |
| `raw/commands.log` | present |
| `.ai/issues/open/ISSUE-046-untruncated-goal-queue-listing-for-agents.md` | present |

## TOON validation

Validated with `npx -y @toon-format/cli --decode`:

- canonical issue TOON synthesis: pass;
- canonical issue required proofs: pass;
- proof-threat-model required proofs: pass.

## Artifact visibility

`git status --short --untracked-files=all` shows the ISSUE-046 issue doc and all transcript artifacts as untracked/visible.

`git check-ignore -v` for a representative artifact matched the `.gitignore` negation pattern `!.ai/docs/issue-workflow/**`, and `git status` confirms the artifact is visible to review.

## Completion decision

ISSUE-046 is execution-ready. No unresolved owner questions remain. Implementation can proceed from the issue doc without deciding the product/API direction: compact default queue list plus explicit full/details retrieval mode.
