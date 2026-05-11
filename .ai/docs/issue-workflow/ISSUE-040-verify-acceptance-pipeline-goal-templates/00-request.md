# ISSUE-040 request intake — Verify acceptance pipeline goal templates

## Parsed request

- Target bucket: `open`
- Issue kind: `feature`
- Requested title: `Verify acceptance pipeline goal templates`
- Chosen issue id: `ISSUE-040`
- Chosen issue path: `.ai/issues/open/ISSUE-040-verify-acceptance-pipeline-goal-templates.md`
- Transcript directory: `.ai/docs/issue-workflow/ISSUE-040-verify-acceptance-pipeline-goal-templates/`

## User intent

Create an execution-ready planning issue for authoring two project-local `.ai/.pi-goals/` reusable goal templates:

1. `verify-acceptance-pipeline` — higher-order workflow for the main agent.
   - Accepts an implemented issue doc path or issue number through `{{args}}`.
   - Spawns an independent Solo/Pi acceptance agent.
   - Sends that agent a direct prompt, not `/boomerang`.
   - Monitors with sparse polling: basic `sleep 90` plus token-efficient Solo process status/output checks.
   - Reviews the acceptance agent report, remediates misses/gaps, sends corrected acceptance items back to the same worker, and loops until all green.

2. `verify-acceptance-item` — inner-loop validation workflow for one acceptance criterion.
   - Used by the acceptance agent for each queued acceptance-item goal.
   - Instructs rigorous validation against issue doc, implementation, proofs, and false-green risks.
   - Produces structured item-level results that roll up into the acceptance agent's final report.

## Explicit constraints

- This issue is for goal-template/workflow authoring only; no extension code changes are intended.
- Review `.ai/docs/prompt-template-authoring.md` and `.ai/.pi-goals/deslop-pipeline.md` as references.
- Do not copy deslop-pipeline's timer-pair monitoring pattern.
- Ignore `/boomerang`; it is not relevant here.
- Design a direct prompt that the main agent sends to the acceptance agent after spawn.
- Plan the full design and implementation until execution-ready.

## Clarification result

No clarification needed. The requested output, target bucket, issue kind, constraints, and design direction are sufficiently specified.

## Initial repository facts

- Existing highest issue before this request: `ISSUE-039`.
- Next issue selected: `ISSUE-040`.
- Initial discovery command transcript: `raw/commands.log`.
