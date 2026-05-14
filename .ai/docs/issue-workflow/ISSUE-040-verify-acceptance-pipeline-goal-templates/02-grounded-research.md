# ISSUE-040 grounded research — Verify acceptance pipeline goal templates

## Research scope

This pass grounded the requested workflow against the actual `pi-goal` template system, existing project-local templates, queue behavior, issue-doc structure, and Solo process control commands.

Command output is recorded in `raw/commands.log`.

## Files and surfaces inspected

Template mechanics and examples:

- `.pi/extensions/goal/templates.ts`
- `.ai/docs/prompt-template-authoring.md`
- `~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/docs/prompt-templates.md`
- `.ai/.pi-goals/deslop-pipeline.md`
- `.ai/.pi-goals/deslop-commit-range.md`
- `.ai/.pi-goals/enqueue-goal-stack.md`
- `.ai/.pi-goals/repo-commit-audit.md`
- `.ai/.pi-goals/release-readme-review.md`
- `.ai/.pi-goals/execute-issue-stack.md`

Project and issue workflow:

- `AGENTS.md`
- `.ai/.pi-goals/create-issue-doc.md`
- `.ai/docs/pi-goals-live-probe-testing.md`
- `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`
- `.ai/issues/fixed/ISSUE-035-multi-item-goal-queue-block.md`
- `.ai/issues/fixed/ISSUE-036-minimum-goal-spend-floors.md`
- `.ai/issues/open/ISSUE-039-recover-active-goal-continuation-after-compaction.md`

Solo orchestration:

- `~/.codex/solo-mcp/SKILL.md`
- `~/.codex/solo-tlo/SKILL.md`
- `solo-mcp --instance solo-pi_goals projects`
- `solo-mcp --instance solo-pi_goals tlo preflight --project 2`
- `solo-mcp --instance solo-pi_goals tlo spawn-worker --help`
- `solo-mcp --instance solo-pi_goals process send --help`

## Grounded facts

### Template discovery and rendering

- `.pi/extensions/goal/templates.ts` discovers reusable goal templates only from explicit root-local directories:
  - `<repo>/.pi-goals`
  - `<repo>/.ai/.pi-goals`
- Template files are collected recursively inside those explicit directories, so the desired files belong at:
  - `.ai/.pi-goals/verify-acceptance-pipeline.md`
  - `.ai/.pi-goals/verify-acceptance-item.md`
- Template frontmatter supports `description`, `aliases`, `usage`, `examples`, `allow_commands`, `command_timeout_ms`, and `command_output_limit`.
- Named flags such as `--issue <path>` become placeholders like `{{issue}}`; trailing text after `--` becomes `{{args}}`.
- Missing placeholders throw a template resolution error, which is useful for requiring `--issue` and item identity in the inner template.
- Inline `!` commands execute through `/bin/bash -lc` only when `allow_commands: true`, with template-scoped timeout and output cap.
- Inline commands should stay read-only and context-rendering. They must not spawn workers, send prompts, mutate queues, or write templates during rendering.

### Existing template patterns

- `deslop-pipeline.md` is the closest higher-order workflow reference:
  - resolves Solo instance/project through a read-only inline command;
  - emits ready-to-run commands;
  - spawns a Solo Pi agent with materialized runtime args;
  - requires the top-level agent to verify worker output rather than trusting the worker.
- The requested new workflow should reuse the resolved-context and explicit command style, but not these `deslop-pipeline` features:
  - `/boomerang` command delivery;
  - `tlo timer-pair` monitoring;
  - Sentrux baseline/post-deslop structure, except where implementation touches `.pi/extensions/goal` unexpectedly.
- `enqueue-goal-stack.md` encodes the desired queue principle: enqueue all listed goals first, then execute head-to-tail without pausing. The acceptance-agent prompt should use this same principle.
- `deslop-commit-range.md` is a good inner-loop template example: it embeds the unit of work in `{{args}}`, provides repo snapshots, constrains scope, and requires proof/validation before completion.

### Queue and issue-doc facts

- Existing issue docs consistently use a `## Acceptance criteria` heading with markdown bullet rows.
- Queue steering rules in `AGENTS.md` require semantic classification before starting queued prose. Orchestration queue items that say to create a goal from a template should be routed through `create_goal_from_template`, then dequeued only after the concrete goal is satisfied.
- Therefore the acceptance agent should enqueue one objective per acceptance criterion using this concrete orchestration shape:

  ```text
  create a goal from template `verify-acceptance-item` with args `--issue "<issue-doc-path>" --item-id "AC-N" -- <acceptance criterion text>`
  ```

- The acceptance agent must enqueue all item objectives first, then process the queue head-to-tail, not interleave extraction and validation in an ad hoc loop.

### Solo control facts

- Current repo resolves to Solo instance/project:
  - instance: `solo-pi_goals`
  - project id: `2`
  - path: `~/dev/personal/experiments/pi-goals`
- `solo-mcp --instance solo-pi_goals tlo preflight --project 2` reports this current session as timer-capable, but the user explicitly wants this template to avoid timers. That user requirement overrides copying `deslop-pipeline`'s timer-pair pattern.
- `solo-mcp process send --input` is the canonical low-level direct prompt delivery path.
- `process send --wait-ms` is only a bounded preview and is not receipt/readiness/absence evidence.
- `solo-mcp process status` and small `process output --lines <N>` reads are the appropriate low-level sparse monitoring primitives when intentionally not using TLO timer pairs.
- True Solo agent behavior is needed because the acceptance worker must run its own Pi session with its own goal queue. Terminal fallback would reduce confidence and should be treated as a blocker or explicit user-approved recovery.

### Live probe expectations

- `.ai/docs/pi-goals-live-probe-testing.md` says changes affecting queue steering, slash commands, process delivery, or live extension runtime should usually get a bounded live probe unless skipped with a visible rationale.
- Implementing these two templates touches reusable goal workflows and live queue orchestration, so a bounded synthetic live probe should be planned after static template validation.

## Planning facts for implementation

- This issue should not require changes under `.pi/extensions/goal/`; the feature is prompt/template authoring only.
- The main implementation surfaces are:
  - `.ai/.pi-goals/verify-acceptance-pipeline.md`
  - `.ai/.pi-goals/verify-acceptance-item.md`
  - optional issue-workflow closeout/probe artifacts documenting validation.
- The pipeline template should use `allow_commands: true` for read-only context resolution:
  - resolve issue selector from `{{args}}` to a concrete issue path when possible;
  - resolve Solo instance/project for the current repo;
  - emit ready-to-run `process spawn`, `process send`, `process status`, and `process output` command templates;
  - emit a deterministic temp artifact prefix under `/tmp` for prompt/report files.
- The item template can also use `allow_commands: true` for read-only snapshots such as issue path existence, `git status --short --untracked-files=all`, and issue headings. It must not run broad validation commands automatically during rendering.
- Because acceptance verification is adversarial, final report shape should distinguish:
  - `green`: criterion independently verified;
  - `red`: criterion not met or proof contradicts it;
  - `blocked`: verification could not be completed safely or lacks needed environment/authority;
  - `needs_main_remediation`: concrete remediation requested from the main agent.

## Gaps identified for issue planning

- Need to lock exact template names, aliases, required placeholders, and queue objective shape.
- Need to lock the initial direct prompt content the main agent sends to the acceptance agent.
- Need to lock sparse polling cadence and output limits so implementation does not recreate timer-based monitoring.
- Need to lock iteration behavior: same acceptance worker re-runs failed/corrected items after main-agent remediation until all green or a real blocker remains.
- Need to include static and live validation proofs that fail if `/boomerang` or timer-pair patterns sneak back into the new pipeline.
