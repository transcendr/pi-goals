# AGENTS — pi-goals

Project: project-local Pi extension implementing `pi-goal`.

Primary code: `.pi/extensions/goal/`.
Canonical planning/research:
- `.ai/issues/`
- `.ai/docs/codex-goal-command-research.md`
- `.ai/.pi-goals/`

## Extension architecture

Keep the extension modular. Current module map is documented by file names in `.pi/extensions/goal/`; preserve separation between entrypoint, command/tools, lifecycle/runtime, state/telemetry, prompts, UI/widget, monitor, and shared domain helpers.

## Required quality gate

Before substantial implementation:

```bash
sentrux gate --save .pi/extensions/goal
```

After implementation, run the single required gate:

```bash
npm run quality:goal
```

This runs Sentrux gate/check, slop guard, TypeScript validation, and Pi extension load validation.

Rules:
- Run Sentrux against `.pi/extensions/goal`, not repo root.
- Fix Sentrux degradation/rule failures unless the user explicitly accepts the tradeoff.
- Do not use TypeScript escape-hatch casts in `.pi/extensions/goal`, especially `as unknown as` or `as any`.

## Issue workflow pointer

For creating/refining issue docs, use `.ai/.pi-goals/create-issue-doc.md` and follow it exactly.

Mandatory unless freshly present in current context:
- Read the full `$feature-workflow-pipelines` `SKILL.md`.
- Read the relevant feature-workflow reference docs named by the prompt/task.
- Produce visible workflow artifacts under `.ai/docs/issue-workflow/ISSUE-NNN-<slug>/`.
- Verify artifacts are trackable with `git status --short --untracked-files=all` and `git check-ignore -v <artifact-path> || true`.

## Goal queue prompt routing

When handling queued pi-goal prose, treat `.ai/.pi-goals/*` as reusable workflows. Before `start_queued_goal` for an abstract/task-type queue item, call `list_goal_templates` and match by name, aliases, description, and placeholders. If exactly one template fits and inputs are available, use `create_goal_from_template`; dequeue the prose item only after that concrete goal is satisfied. Use `start_queued_goal` only for direct one-off goals.

Never discard queued work. Do not call `dequeue_goal` unless the queue head is actually satisfied or the user explicitly authorizes removing that specific queued item. If uncertain, leave it queued and report the blocker.

## Solo

Solo instance: `solo-pi_goals`; project id: `2`.

```bash
solo-mcp --instance solo-pi_goals todos --project 2 --status open
```
