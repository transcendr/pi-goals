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
npm run gates:quality
```

This runs Sentrux gate/check, slop guard, TypeScript validation, and Pi extension load validation.

Rules:
- Run Sentrux against `.pi/extensions/goal`, not repo root.
- Fix Sentrux degradation/rule failures unless the user explicitly accepts the tradeoff.
- Do not use TypeScript escape-hatch casts in `.pi/extensions/goal`, especially `as unknown as` or `as any`.

## Repo artifact hygiene

Do not add repo-tracked docs, validation notes, design notes, or closeout/result files unless they will be read, maintained, or used by future work.

Default ephemeral evidence to `/tmp` (for example live-probe transcripts, debug logs, one-off summaries, command captures). Keep durable repo artifacts only when:
- the user explicitly asks for a repo-tracked file/path;
- an existing project workflow requires the artifact, such as issue workflow docs under `.ai/docs/issue-workflow/...`;
- the artifact is a reusable test/probe/script that will be run again; or
- the content is necessary long-term documentation, not just proof that this turn happened.

If the likely future use is "probably never", do not write it into the repo. If a user says to "write results" or "record evidence" without specifying a repo path, prefer `/tmp` or the final response. Ask before creating a new repo artifact when durability is ambiguous.

### Solo scratchpads

Use Solo scratchpads for temporary or agent-local tracking that should not be repo-tracked, but do not create scratchpads for material you will probably never read again after it leaves the current context window.

Appropriate uses:
- ephemeral work tracking that does not belong in todos; clean it up after use;
- active workflow docs, such as execution playbooks;
- durable docs, reminders, workflows, and self-protocols that should be maintained but that the user has not authorized to be repo-tracked.

Prefer updating an existing relevant scratchpad over creating many new ones.

## Issue workflow pointer

For creating/refining issue docs, use `.ai/.pi-goals/create-issue-doc.md` and follow it exactly.

Mandatory unless freshly present in current context:
- Read the full `$feature-workflow-pipelines` `SKILL.md`.
- Read the relevant feature-workflow reference docs named by the prompt/task.
- Produce visible workflow artifacts under `.ai/docs/issue-workflow/ISSUE-NNN-<slug>/`.
- Verify artifacts are trackable with `git status --short --untracked-files=all` and `git check-ignore -v <artifact-path> || true`.

## Working with Pi-goals

### Goal queue prompt routing

When handling queued pi-goal prose, treat `.ai/.pi-goals/*` as reusable workflows. Before `start_queued_goal` for an abstract/task-type queue item, call `list_goal_templates` and match by name, aliases, description, and placeholders. If exactly one template fits and inputs are available, use `create_goal_from_template`; dequeue the prose item only after that concrete goal is satisfied. Use `start_queued_goal` only for direct one-off goals.

Never discard queued work. Do not call `dequeue_goal` unless the queue head is actually satisfied or the user explicitly authorizes removing that specific queued item. If uncertain, leave it queued and report the blocker.

### Goal queue processing and semantics

If you are asked to queue multiple goals at once, you must FIRST enqueue each goal, and then create and individually process each goal on the queue.

Never violate the queue semantics by batching queue work and then dequeuing multiple queued work items at once as if it had run individually; Each goal on the queue MUST be run individually - no exceptions. Process each queued item as its own concrete goal. If the queued goal objective indicates or references a goal template, treat the goal as an orchestration type goal and create it with `create_goal_from_template`.


## Live probe validation

Canonical guide: `.ai/docs/pi-goals-live-probe-testing.md`.

When work on `pi-goals` changes or fixes behavior, especially slash commands, queue/resume steering, continuation, UI/status rendering, or live extension runtime behavior, usually validate it on the live probe surface unless instructed otherwise.

Live probes complement deterministic tests; they do not replace `npm run gates:quality` or targeted probes. For a small change with direct, unambiguous deterministic coverage, the live probe may be skipped to save time/tokens, but provide a visible reason in the current closeout context.

Do not hard-code a Solo process id. Resolve the current `pi-goals-live-probe` process from the active Solo context and prefer the existing running process. Spawn a new Pi runtime agent named `pi-goals-live-probe` only when no suitable existing probe is alive.

## Solo

Solo instance: `solo-pi_goals`; project id: `2`.

```bash
solo-mcp --instance solo-pi_goals todos --project 2 --status open
```
