# 01 — Protocol read

## Files read completely or to documented end

```toon
toon.version: 1
protocol_files[7]{id,path,purpose}:
  "p1","AGENTS.md","project rules for pi-goals issue workflow, gates, queue routing, and live probes"
  "p2","/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/SKILL.md","governing feature-workflow issue-first/remediation pipeline"
  "p3","/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/canonical-issue-docs-and-toon-synthesis.md","canonical issue structure, proof threat model, required_proofs shape"
  "p4","/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/research-pass.md","grounded research pass method"
  "p5","/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/design-landscape-exploration-and-choice-locking.md","design choice locking method"
  "p6","/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/toon-for-issues-and-execution-planning.md","TOON issue-planning guidance"
  "p7","/Users/bryan/.agents/skills/axi/SKILL.md","TOON syntax and agent-facing output guidance because the issue will contain required_proofs TOON"
```

## Extracted requirements

```toon
workflow_requirements[10]{id,requirement}:
  "w1","Use `.ai/.pi-goals/create-issue-doc.md` protocol and create visible artifacts under `.ai/docs/issue-workflow/ISSUE-NNN-<slug>/`."
  "w2","Read project AGENTS and full feature-workflow skill/reference docs before drafting."
  "w3","Ground claims in live repo inspection; do not invent implementation facts."
  "w4","Create request, protocol-read, grounded-research, design-lock, proof-threat-model, issue-writeback, final-audit, and raw command transcript artifacts."
  "w5","Make the issue doc canonical and execution-ready when possible; unresolved design forks block execution-ready status."
  "w6","Include links from the issue doc to every transcript artifact."
  "w7","When Solo/TLO/proof-driven execution is expected, include valid importable `required_proofs[]` TOON."
  "w8","Proofs must be adversarial and would fail if the behavior remains broken; live runtime/control helpers usually need bounded live probes plus cleanup."
  "w9","TOON blocks must use valid TOON syntax with row schemas, not markdown bullets."
  "w10","Verify artifact visibility with `git status --short --untracked-files=all` and `git check-ignore -v <artifact-path> || true`."
```

## Pipeline chosen

Issue-first canonical-doc pipeline, with remediation emphasis: this is a follow-up planning issue for already-existing templates/runtime behavior after live evidence exposed behavioral gaps.
