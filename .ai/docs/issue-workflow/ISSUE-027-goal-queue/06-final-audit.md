# 06 Final audit

Protocol compliance matrix:

checks[8]{check,result,evidence}:
  "request parsed","pass","00-request.md records bucket/kind/title/context and ISSUE-027 path"
  "protocol read","pass","01-protocol-read.md records AGENTS, feature-workflow references, and AXI"
  "grounded research","pass","02-grounded-research.md records live code/docs inspected and concrete findings"
  "design lock","pass","03-design-lock.md locks persisted FIFO queue and rejects full multi-goal runtime"
  "proof threat model","pass","04-proof-threat-model.md records invariant, false greens, and proof strategy"
  "issue writeback","pass","05-issue-writeback.md records canonical issue sections written"
  "canonical issue exists","pass",".ai/issues/open/ISSUE-027-goal-queue.md exists and links artifacts"
  "artifact visibility","pass","git status shows issue-workflow artifacts; check-ignore reports no ignore match"

Visibility commands:

```text
?? .ai/docs/issue-workflow/ISSUE-027-goal-queue/00-request.md
?? .ai/docs/issue-workflow/ISSUE-027-goal-queue/01-protocol-read.md
?? .ai/docs/issue-workflow/ISSUE-027-goal-queue/02-grounded-research.md
?? .ai/docs/issue-workflow/ISSUE-027-goal-queue/03-design-lock.md
?? .ai/docs/issue-workflow/ISSUE-027-goal-queue/04-proof-threat-model.md
?? .ai/docs/issue-workflow/ISSUE-027-goal-queue/05-issue-writeback.md
?? .ai/docs/issue-workflow/ISSUE-027-goal-queue/raw/commands.log
?? .ai/issues/open/ISSUE-027-goal-queue.md

```

Ignore check:

```text
.gitignore:8:!.ai/docs/issue-workflow/**	.ai/docs/issue-workflow/ISSUE-027-goal-queue/00-request.md

```
