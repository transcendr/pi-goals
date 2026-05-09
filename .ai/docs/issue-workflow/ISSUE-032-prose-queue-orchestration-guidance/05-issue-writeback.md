# 05 — Issue Writeback

## Canonical issue written

- Path: `.ai/issues/open/ISSUE-032-prose-queue-orchestration-guidance.md`
- Title: `ISSUE-032 — Prose queue orchestration guidance`
- Status: `open — execution-ready`
- Target bucket: `open`
- Issue kind: `feature`

## Sections written

section_checklist[12]{section,status,evidence}:
  "front_matter","written","status priority owner created next session target bucket kind roots parent depends related"
  "goal","written","direct-vs-orchestration queued-goal steering goal"
  "problem_context","written","JIT deslop and execute-issue-stack examples plus current gap"
  "transcript_artifacts","written","links to 00 through 06 and raw commands log"
  "research_findings","written","live files and findings summarized with artifact pointer"
  "locked_design_choices","written","prompt-guidance-only design and rejected parser/tool alternatives"
  "implementation_checklist","written","queue-steering update and focused probe tasks"
  "acceptance_criteria","written","direct, prose/JIT, safe dequeue, no parser, no new tools, quality gate"
  "proof_threat_model","written","primary invariant and false-green modes"
  "toon_synthesis","written","valid TOON block with issue requirements surfaces invariants checks"
  "required_proofs","written","valid TOON required_proofs block with concrete commands"
  "artifact_links","written","all required transcript artifacts linked"

## Planning truth captured

- The issue locks a minimal first pass: update queue steering guidance, do not add parser heuristics, do not add new specialized tools.
- The issue distinguishes structured template metadata from flexible prose/JIT orchestration.
- The issue records the key user requirement that one orchestration queue item may require one or more consecutive active goals before `dequeue_goal`.
- The issue requires a focused non-template steering-content probe and preservation of existing template steering behavior.

## Writeback order compliance

The issue doc was written after these workflow artifacts existed:

- `00-request.md`
- `01-protocol-read.md`
- `02-grounded-research.md`
- `03-design-lock.md`
- `04-proof-threat-model.md`
- `raw/commands.log`

This satisfies the requirement to perform and record the research/design/proof loops before final issue writeback.
