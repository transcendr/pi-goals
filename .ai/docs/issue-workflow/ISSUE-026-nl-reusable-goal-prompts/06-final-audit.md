# 06-final-audit — ISSUE-026

## Protocol compliance matrix

checks[10]{id,requirement,evidence,status}:
  "c1","Read AGENTS.md","01-protocol-read.md lists AGENTS.md and extracted requirements","pass"
  "c2","Read full feature-workflow skill and relevant references","01-protocol-read.md lists SKILL.md plus canonical issue, research, design, and TOON references","pass"
  "c3","Use AXI because task touches agent-facing ergonomics","01-protocol-read.md lists AXI and extracted requirements","pass"
  "c4","Create request artifact","00-request.md exists with parsed inputs and path choice","pass"
  "c5","Run grounded research before issue writeback","02-grounded-research.md records inspected code/docs and findings","pass"
  "c6","Lock design choices before execution-ready issue","03-design-lock.md chooses dedicated model-facing template-goal path and rejects alternatives","pass"
  "c7","Create proof threat model","04-proof-threat-model.md records invariant false greens and proof rows","pass"
  "c8","Write canonical issue doc after artifacts","05-issue-writeback.md records issue writeback and sections","pass"
  "c9","Link every artifact from issue doc","ISSUE-026 transcript artifact section lists all artifacts","pass"
  "c10","Verify artifact visibility","raw/commands.log includes git status and git check-ignore verification commands","pass"

## Final artifact set

```text
.ai/docs/issue-workflow/ISSUE-026-nl-reusable-goal-prompts/00-request.md
.ai/docs/issue-workflow/ISSUE-026-nl-reusable-goal-prompts/01-protocol-read.md
.ai/docs/issue-workflow/ISSUE-026-nl-reusable-goal-prompts/02-grounded-research.md
.ai/docs/issue-workflow/ISSUE-026-nl-reusable-goal-prompts/03-design-lock.md
.ai/docs/issue-workflow/ISSUE-026-nl-reusable-goal-prompts/04-proof-threat-model.md
.ai/docs/issue-workflow/ISSUE-026-nl-reusable-goal-prompts/05-issue-writeback.md
.ai/docs/issue-workflow/ISSUE-026-nl-reusable-goal-prompts/06-final-audit.md
.ai/docs/issue-workflow/ISSUE-026-nl-reusable-goal-prompts/raw/commands.log
```

## Final issue doc

```text
.ai/issues/open/ISSUE-026-nl-reusable-goal-prompts.md
```

## Unresolved questions

None for planning. The issue is execution-ready; exact tool names and TypeBox field names can be finalized during implementation within the locked design.
