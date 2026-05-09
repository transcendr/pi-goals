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

## Solo

Solo instance: `solo-pi_goals`; project id: `2`.

```bash
solo-mcp --instance solo-pi_goals todos --project 2 --status open
```
