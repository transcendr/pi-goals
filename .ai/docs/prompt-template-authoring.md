# Prompt Template Authoring

This guide is for project-local reusable goal templates in `.ai/.pi-goals/*.md`.

These templates are consumed by the `pi-goal` extension, not Pi's built-in `.pi/prompts` slash templates. They use frontmatter plus `{{placeholder}}` interpolation, and may optionally run inline read-only shell commands during goal creation.

## General workflow

1. Receive a description of the reusable goal workflow the user wants.
2. Read this guide before authoring or revising the template.
3. Inspect nearby templates in `.ai/.pi-goals/` for style and existing reusable workflows.
4. Before writing the template, review the source resources that define the exact semantics you plan to encode. Do not invent command flags, placeholder behavior, queue behavior, or Solo/TLO orchestration rules from memory.
5. Create or update the template in `.ai/.pi-goals/`.
6. Validate discovery with `list_goal_templates` or an equivalent dry check.
7. If the template uses inline commands, verify those commands are read-only and deterministic.

## Source resources to review before authoring

Reusable goal templates should directly encode exact project/tool knowledge when that knowledge reduces execution ambiguity. Before generating a template, review the relevant resources below and integrate the concrete command shapes, flags, constraints, and examples into the template itself. The executing agent should not have to rediscover deterministic details that the template can safely render.

### Pi-goal template mechanics

- `.pi/extensions/goal/templates.ts` — Source of truth for project-local template parsing. Use it to verify frontmatter keys, alias parsing, `{{placeholder}}` interpolation, `{{args}}` handling, `--flag value` parsing, inline `!` command syntax, command timeout/output limits, and command execution behavior.
- `~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/docs/prompt-templates.md` — Pi's built-in prompt-template documentation. Use it for broader prompt-template concepts and to avoid confusing Pi core prompt templates with this repo's `.ai/.pi-goals/` reusable goal templates.
- `.ai/.pi-goals/create-issue-doc.md` — Good example of a structured reusable goal prompt with required named placeholders, trailing `{{args}}`, explicit workflow requirements, visible artifacts, and completion standards.
- `.ai/.pi-goals/deslop-commit-range.md` — Good example of a focused code-quality workflow template with embedded repo snapshots, validation gates, scope constraints, and a behavior-preserving completion standard.
- `.ai/.pi-goals/deslop-pipeline.md` — Example of targeted inline command rendering: read-only context resolution, heredoc-safe placeholder handling, concrete ready-to-run Solo commands, and explicit blocker output when deterministic context cannot be resolved. Verify the file's current contents before copying patterns.

### Inline command rendering examples

- `.ai/.pi-goals/execute-issue-stack.md` — Useful example of `allow_commands: true` and inline `!` command resolution. Its whole-prompt renderer is not the default pattern; it was used because issue-stack rendering builds a complex resolved prompt from issue selectors.
- `.ai/.pi-goals/scripts/render_issue_stack_prompt.py` — Useful for understanding how complex prompt rendering can resolve repo context and produce exact instructions. Do not copy this as the normal pattern; prefer small targeted inline command blocks unless the rendering logic is genuinely too complex for readable Markdown.

### Solo / TLO orchestration resources

- `~/.pi/agent/.cache/codex-skills/solo-mcp/SKILL.md` — Primary source for `solo-mcp` semantics. Review this before authoring templates that spawn processes, send input, read status/output, operate timers, use TLO helpers, or manage scratchpads/todos. It documents instance selection, true agent spawning, materialized Pi runtime args, `process send`, `tlo timer-pair`, token-efficient snapshots, closeout/proof patterns, and error/recovery conventions.
- `~/.pi/agent/.cache/codex-skills/solo-tlo/SKILL.md` — Review for top-level-operator workflows where the template will supervise Solo workers, maintain run ledgers, handle timer wake-ups, or verify worker results instead of trusting reports. Use it to encode safe queue-vs-interrupt and closeout behavior.
- `solo-mcp --instance <instance> tlo help` and topic help such as `solo-mcp --instance <instance> tlo timer-pair --help`, `solo-mcp --instance <instance> tlo spawn-worker --help`, and `solo-mcp --instance <instance> tlo worker snapshot --help` — Use these command-help outputs to confirm exact current CLI shapes before embedding examples. Inline templates should contain commands the executing agent can run directly, not vague placeholders.
- `solo-mcp --instance <instance> projects`, `solo-mcp --instance <instance> processes --project <id>`, and `solo-mcp instances` — Use these read-only commands inside inline renderers when deriving concrete Solo context for the current repo. Keep derivation read-only; do not spawn/send/arm timers during template expansion.

### Project policy and validation resources

- `AGENTS.md` — Project-local rules for `.ai/.pi-goals/` routing, queue safety, live probes, issue workflow artifacts, and the required `npm run quality:goal` gate for extension implementation. Review it before templates that create goals, queue work, or touch `.pi/extensions/goal/`.
- `.ai/docs/pi-goals-live-probe-testing.md` — Review before templates that require live Pi runtime validation, slash-command behavior, queue/resume steering, or UI/status rendering. Use it to encode non-hard-coded live probe instructions.
- `.ai/docs/prompt-template-authoring.md` — This guide. Re-read it when revising templates so improvements made for one workflow carry forward to the next.

When a resource gives precise command syntax or safety constraints, copy those details into the template in a concrete, execution-ready way. For Solo/TLO templates, examples include: render a ready `solo-mcp process spawn` command with resolved `--instance` and `--project`; state that true Solo agent semantics are required when the workflow depends on agent behavior; specify `tlo timer-pair arm --check-ms 60000`; specify routine `timer-pair pop --tail-if never` and bounded tail only when suspect.

## Template frontmatter

Recommended frontmatter shape:

```markdown
---
description: Short description shown by template discovery
aliases: short-alias,another-alias
usage: /goal template-name --flag value -- trailing args
examples: /goal template-name --flag value -- HEAD~5..HEAD
allow_commands: false
command_timeout_ms: 10000
command_output_limit: 30000
---
```

Guidelines:

- `description` should name the workflow outcome, not just the first step.
- `aliases` should be short and stable; avoid aliases that collide semantically with existing templates.
- `usage` and `examples` should show the intended `/goal` invocation exactly.
- Use `allow_commands: true` only when the body contains inline `!` command blocks.
- Set `command_timeout_ms` and `command_output_limit` when inline commands may call local tools or produce non-trivial output.

## Placeholders and arguments

- Named flags become placeholders: `/goal template-name --mode review -- trailing context` provides `{{mode}}`.
- Everything after `--` becomes `{{args}}`.
- Missing placeholders block template resolution, which is preferable to silently guessing.
- Prefer placeholders for user intent, not deterministic context. For example, commit range and rethrow count are user intent; Solo project id is derivable context.

## Using inline command execution to reduce cognitive load

Goal templates should avoid pushing deterministic discovery work onto the executing agent with placeholders like `<instance>`, `<project_id>`, or `<repo_path>` when those values can be derived safely.

Use `allow_commands: true` and inline command resolution to pre-render read-only context. For a concrete example, inspect `.ai/.pi-goals/deslop-pipeline.md` and look for the resolved Solo context / `ready_to_run_commands` inline block.

Good inline command uses:

- Resolve Solo instance/project for the current repository.
- Print ready-to-run commands with concrete instance/project values.
- Show compact repo status or changed-file context.
- Render small read-only inventories from local tools.

Bad inline command uses:

- Spawning workers.
- Sending prompts or slash commands.
- Mutating files, queues, todos, scratchpads, timers, git state, or external services.
- Running expensive validation gates during template expansion unless the user explicitly requested that as part of rendering.

Inline commands should be read-only/context-rendering only. They should not perform side effects that belong to the executing agent's workflow.

## Inline command shape

Prefer small targeted inline blocks that produce compact, labelled output:

```markdown
<resolved_context>
!`python3 - <<'PY'
print("context_status: resolved")
print("ready_command: example --with concrete-values")
PY`
</resolved_context>
```

If interpolated arguments may contain shell-sensitive characters, pass them through quoted heredocs:

```markdown
!`USER_ARGS=$(cat <<'PI_GOAL_ARGS'
{{args}}
PI_GOAL_ARGS
)
export USER_ARGS
python3 - <<'PY'
import os
print(os.environ["USER_ARGS"])
PY`
```

Rules:

- Do not include shell backticks inside an inline command; the template parser uses backticks as delimiters.
- Prefer TOON-like labelled output over prose paragraphs.
- Print `*_status: unresolved` plus a concrete blocker when context cannot be derived.
- Prefer ready-to-run commands over instructions to rediscover values manually.
- Keep output bounded and relevant to the workflow.

## Avoid whole-prompt renderers by default

`execute-issue-stack.md` renders its entire prompt body via a Python script. That was used because issue-stack rendering builds a complex resolved prompt from issue selectors; it is not the default authoring pattern.

Do not reproduce that pattern by default. Prefer normal Markdown prompt bodies with a few focused inline command blocks.

Use a script in `.ai/.pi-goals/scripts/` only when:

- the rendering logic is too complex or too reusable for a readable inline command;
- the script has one clear responsibility;
- the script output is a section of the prompt, not necessarily the whole prompt;
- the user has not asked for a simpler inline-only template.

Example targeted script call:

```markdown
!`COMMIT_RANGE=$(cat <<'PI_GOAL_COMMIT_RANGE'
{{args}}
PI_GOAL_COMMIT_RANGE
) python3 .ai/.pi-goals/scripts/get_range_diff.py`
```

Do not create a script for trivial command output that can be rendered safely with one inline command.

## Workflow authoring standards

- Encode the actual work, not meta-instructions like “create a goal to...”, unless goal creation is itself the requested workflow.
- Make completion conditions explicit.
- State blockers and escalation rules.
- Do not make `stop and escalate` the default response to minor friction. For expected transient or recoverable failures, encode a bounded recovery path first: retry once, rerun the status check, inspect the concrete error, use a rendered recovery command, or ask for a focused decision only after the workflow cannot safely continue. Escalation is a last resort for true blockers, unsafe ambiguity, missing authority, destructive decisions, unavailable required capabilities, or repeated failure after the specified recovery attempt.
- Distinguish hard blockers from soft failures in the template. For example, if a workflow sends a command to a worker process and then checks output for confirmation, an unclear first output check should usually trigger a bounded retry of the same command plus another confirmation check before escalation; do not abandon the workflow at the first unclear output.
- Include proof/validation requirements when the workflow changes code, reviews worker output, or depends on external orchestration.
- For queued orchestration, remind the agent not to discard queued work and to dequeue only after satisfaction.
- Keep reusable prompts deterministic and narrowly scoped; avoid broad “do whatever is best” language.

## Validation checklist

Before reporting completion:

- `list_goal_templates` shows the template, aliases, and required placeholders correctly.
- Inline commands are read-only and have bounded timeout/output limits.
- Any rendered commands use concrete derivable values where possible.
- Required user inputs remain placeholders and are visible in `usage`/`examples`.
- The template does not generate the entire body from a script unless explicitly justified.
- The final template is trackable by git and not hidden by ignore rules.
