# 06 — Final Audit

## Objective restated

Create an execution-ready issue doc in `.ai/issues/open/` for prose/JIT queue orchestration guidance, using the feature-workflow protocol visibly. The issue must preserve flexible prose queue items as a feature, reject brittle parser/tool proliferation, and require unconditional `queueSteeringContent` guidance for direct queued goals versus orchestration prose, including multi-goal-before-dequeue behavior.

## Prompt-to-artifact checklist

checklist[16]{requirement,evidence,status}:
  "read AGENTS.md","01-protocol-read.md lists AGENTS.md and extracted project requirements","pass"
  "read feature workflow skill","01-protocol-read.md lists full SKILL.md and extracted workflow requirements","pass"
  "read relevant references","01-protocol-read.md lists canonical issue docs, research pass, design locking, TOON, pipelines, AXI","pass"
  "choose bucket open","00-request.md and issue front matter select open","pass"
  "determine issue number","raw/commands.log records ISSUE-032 next-number command","pass"
  "create transcript directory","git status shows .ai/docs/issue-workflow/ISSUE-032-prose-queue-orchestration-guidance artifacts","pass"
  "write 00 request","00-request.md exists with parsed request and assumptions","pass"
  "write 01 protocol read","01-protocol-read.md exists with exact files read and requirements","pass"
  "write 02 grounded research","02-grounded-research.md exists with commands/files/findings","pass"
  "write 03 design lock","03-design-lock.md exists with options chosen and rejected alternatives","pass"
  "write 04 proof threat model","04-proof-threat-model.md exists with invariant false greens and proof rows","pass"
  "write issue after artifacts","05-issue-writeback.md records issue was written after 00-04/raw existed","pass"
  "include artifact links in issue","issue doc lines 45-52 link required artifacts and raw log","pass"
  "include TOON synthesis","issue doc contains fenced TOON block with toon.version 1 and row tables","pass"
  "include required_proofs[]","issue doc contains fenced required_proofs TOON block with concrete commands","pass"
  "verify artifact visibility","raw/commands.log records git status and git check-ignore for artifact path","pass"

## Evidence inspected for completion

- `.ai/issues/open/ISSUE-032-prose-queue-orchestration-guidance.md` exists.
- Required artifacts exist:
  - `00-request.md`
  - `01-protocol-read.md`
  - `02-grounded-research.md`
  - `03-design-lock.md`
  - `04-proof-threat-model.md`
  - `05-issue-writeback.md`
  - `06-final-audit.md`
  - `raw/commands.log`
- `git status --short --untracked-files=all` shows the issue doc and artifacts as untracked, visible files.
- `git check-ignore -v .ai/docs/issue-workflow/ISSUE-032-prose-queue-orchestration-guidance/00-request.md || true` reports the negative unignore rule `!.ai/docs/issue-workflow/**`, proving the artifact path is trackable.
- `rg` against the issue doc confirms the issue id, artifact links, prose/JIT wording, `dequeue_goal` guidance, and `queue_orchestration_steer_probe` proof row are present.

## Missing or weak coverage

None for issue-doc creation. Implementation and validation remain future work for the queued `execute-issue-stack` goal.

## Final conclusion

The requested issue-doc creation goal is complete. The issue is execution-ready and grounded in inspected files, with visible transcript artifacts and required proof rows.
