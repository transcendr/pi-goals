# ISSUE-040 protocol read

## Governing workflow

The active goal is a `create-issue-doc` reusable goal. The governing protocol is `$feature-workflow-pipelines` issue-first canonical-doc workflow.

## Files read fully or freshly present in context

Project/workflow docs:

- `AGENTS.md` — project rules for issue docs, `.ai/.pi-goals`, Solo context, queue routing, live probes, and quality gates.
- `.ai/.pi-goals/create-issue-doc.md` — reusable goal prompt defining mandatory issue-doc creation artifacts and completion standard.
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/SKILL.md` — issue-first canonical-doc pipeline and execution-ready standard.
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/canonical-issue-docs-and-toon-synthesis.md` — canonical issue structure, TOON synthesis, and execution-readiness gate.
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/research-pass.md` — grounded research pass requirements.
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/design-landscape-exploration-and-choice-locking.md` — design fork locking requirements.
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/toon-for-issues-and-execution-planning.md` — practical TOON planning shape and anti-fake-green guidance.
- `/Users/bryan/.agents/skills/axi/SKILL.md` — TOON/agent-facing CLI output discipline used for issue TOON rows and rendered Solo command shape.

Template authoring and Pi template mechanics:

- `.ai/docs/prompt-template-authoring.md` — source-of-truth authoring guide requested by the user.
- `.pi/extensions/goal/templates.ts` — actual `.ai/.pi-goals` discovery, frontmatter, placeholder, `{{args}}`, flags, and inline-command behavior.
- `/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/docs/prompt-templates.md` — Pi core prompt-template docs to avoid confusing core prompt templates with `pi-goal` reusable goal templates.
- `.ai/.pi-goals/deslop-pipeline.md` — reference higher-order Solo-supervised pipeline template requested by the user, with explicit decision to reject its timer-pair and `/boomerang` parts for this issue.
- `.ai/.pi-goals/deslop-commit-range.md` — focused inner workflow template example.
- `.ai/.pi-goals/enqueue-goal-stack.md` — queue head-to-tail semantics and exact no-pause language.
- `.ai/.pi-goals/execute-issue-stack.md` — example of complex rendering via script, considered but not chosen for this workflow.
- `.ai/.pi-goals/repo-commit-audit.md` and `.ai/.pi-goals/release-readme-review.md` — compact inline context/rendering examples.
- `.ai/docs/pi-goals-live-probe-testing.md` — live probe expectations for queue/slash-command/runtime behavior when implementing and validating these templates.

Solo orchestration docs:

- `/Users/bryan/.pi/agent/.cache/codex-skills/solo-mcp/SKILL.md` — Solo CLI semantics, process spawn/send/status/output, materialized Pi runtime, and token-efficient read patterns.
- `/Users/bryan/.pi/agent/.cache/codex-skills/solo-tlo/SKILL.md` — TLO worker orchestration, process truth vs report truth, sparse monitoring, and closeout verification.

Issue examples inspected:

- `.ai/issues/open/ISSUE-021-goal-completion-proofs.md` — acceptance criteria, proof threat model, required proof rows, and anti-false-green issue shape.
- `.ai/issues/fixed/ISSUE-036-minimum-goal-spend-floors.md` — rich execution-ready issue shape, acceptance criteria, TOON synthesis, and required proofs.
- `.ai/issues/fixed/ISSUE-035-multi-item-goal-queue-block.md` — queue semantics and acceptance-criteria/proof structure.
- `.ai/issues/open/ISSUE-039-recover-active-goal-continuation-after-compaction.md` — recent issue structure and deterministic/live proof closeout style.

## Extracted requirements

- Create visible artifacts under `.ai/docs/issue-workflow/ISSUE-040-verify-acceptance-pipeline-goal-templates/` before final writeback.
- The final issue doc must be canonical, grounded, and execution-ready unless a real blocker remains.
- Meaningful design choices must be locked; the implementation session should not choose whether to use direct prompts vs `/boomerang`, timers vs sparse polling, or one combined template vs two templates.
- Use valid TOON syntax for synthesis and `required_proofs[]` blocks: include `toon.version: 1`, row counts, row field names, and concrete rows.
- Required proofs for Solo/TLO-oriented issues must be concrete enough to import/register or execute without translating vague prose.
- For `.ai/.pi-goals` templates:
  - templates live under `<repo>/.pi-goals` or `<repo>/.ai/.pi-goals`, with recursive file collection inside those explicit roots;
  - filename becomes template name, including subdirectory names if any;
  - frontmatter supports `description`, `aliases`, `usage`, `examples`, `allow_commands`, `command_timeout_ms`, and `command_output_limit`;
  - flags are `--flag value`, trailing text after `--` becomes `{{args}}`, and missing placeholders block resolution;
  - inline `!` commands are allowed only when `allow_commands: true` and must be read-only/context-rendering.
- For Solo workflow templates:
  - derive Solo instance/project with read-only inline commands where possible;
  - emit ready-to-run commands with concrete values;
  - use true Solo agent process semantics for independent agent behavior;
  - use `process send --input` for direct prompt delivery;
  - treat `--wait-ms` output as only a bounded preview, not readiness or absence proof;
  - verify worker reports by inspecting artifacts and repo state yourself.
- Live validation expectations:
  - implementation should at minimum validate template discovery and interpolation with `list_goal_templates` / template creation;
  - because the pipeline depends on real queue steering and Solo process input delivery, a bounded live probe is expected unless explicitly skipped with a visible rationale.
- User-specific deltas from `deslop-pipeline`:
  - do not use Solo timer pairs in the new pipeline;
  - do not use `/boomerang`;
  - use a direct acceptance-agent prompt;
  - use sparse polling with 90-second sleeps plus compact status/output checks.

## Protocol compliance note

This artifact records the mandatory protocol read before issue writeback. The raw command transcript includes line counts proving the relevant docs were fully readable in this session.
