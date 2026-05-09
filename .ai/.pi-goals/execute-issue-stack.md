---
description: Plan and execute one or more issue docs through Solo or markdown fallback artifacts with dependency graph, playbook, and per-issue active goals
aliases: execute-issues,issue-stack,run-issues,solo-issue-stack
usage: /goal issue-stack -- ISSUE-025 ISSUE-026
examples: /goal execute-issues -- 25-26; /goal issue-stack -- ISSUE-012,ISSUE-025,ISSUE-026
allow_commands: true
command_timeout_ms: 10000
command_output_limit: 30000
---
Create a goal to execute an issue or issue stack end-to-end with auditable todo decomposition, dependency mapping, a high-level execution playbook, per-issue active goals, progress updates, and closeout comments.

<issue_stack_request>
  <issue_selector>{{args}}</issue_selector>
</issue_stack_request>

The issue selector may name one issue, a comma/space-separated list, or a numeric range such as `25-27`. Resolve selectors to canonical issue docs under `.ai/issues/**/ISSUE-NNN-*.md` before creating todos. If selector resolution is ambiguous or no matching issue doc exists, ask exactly one focused clarification before mutating Solo state or writing fallback artifacts.

Use `$solo-mcp` when the current shell is inside a Solo context/environment. Do not require the user to pass instance or project flags. Determine Solo context automatically from `solo-mcp --instance solo whoami --json`: `--instance solo` points to the current Solo instance, and the current project id/name is available from the `project` object. If `whoami` fails, returns no effective project, or shows that this agent is not operating in Solo context, use markdown fallback artifacts instead of Solo todos/scratchpads.

Start from these embedded snapshots as initial context, then inspect files directly before creating todos/artifacts or starting work:

<repo_status>
!`git status --short --untracked-files=all`
</repo_status>

<issue_inventory>
!`find .ai/issues/open .ai/issues/refine .ai/issues/defer .ai/issues/fixed .ai/issues/closed -maxdepth 1 -type f -name 'ISSUE-*.md' 2>/dev/null | sort`
</issue_inventory>

<solo_whoami>
!`solo-mcp --instance solo whoami --json 2>/dev/null || true`
</solo_whoami>

<solo_open_todos_if_available>
!`PROJECT_ID=$(solo-mcp --instance solo whoami --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{try{const j=JSON.parse(s); const id=j.project?.effective_id ?? j.project?.id; if(id) process.stdout.write(String(id));}catch{}})' 2>/dev/null); if [ -n "$PROJECT_ID" ]; then solo-mcp --instance solo todos --project "$PROJECT_ID" --status open 2>/dev/null || true; fi`
</solo_open_todos_if_available>

Context mode decision:

- **Solo mode**: `solo-mcp --instance solo whoami --json` succeeds and reports an effective project for this repository/context. Use Solo todos and scratchpads.
- **Markdown fallback mode**: Solo context is absent, not usable, or not clearly tied to the current work. Replace Solo todos with markdown todo files and replace Solo scratchpads with markdown playbook/scratchpad files.

Markdown fallback artifact locations:

- For each issue, use or create `.ai/docs/issue-workflow/ISSUE-NNN-<slug>/` where `<slug>` matches the issue filename slug when possible.
- Put todo artifacts under `.ai/docs/issue-workflow/ISSUE-NNN-<slug>/todos/`.
- Put scratchpad/playbook artifacts under `.ai/docs/issue-workflow/ISSUE-NNN-<slug>/scratchpads/`.
- If a stack spans multiple issues, create a stack index under the first issue's workflow directory, for example `.ai/docs/issue-workflow/ISSUE-NNN-<slug>/todos/issue-stack-index.md`, and link to every other issue workflow directory.
- If the issue-workflow subdirectory does not exist yet, create it. These artifacts must be visible to `git status --short --untracked-files=all`; if ignored, fix ignore rules or report the blocker.

Required planning workflow before implementation:

1. Resolve execution context automatically:
   - run/read `solo-mcp --instance solo whoami --json`;
   - if usable, record Solo instance as `solo` and project id/name from `whoami`;
   - otherwise select markdown fallback mode and record why.
2. Resolve every requested issue selector to an actual issue doc path. Read every issue doc fully enough to extract goal, scope, acceptance criteria, required proofs, dependencies, risks, and quality gates.
3. Build a full execution stack model covering 1..N issues:
   - issue order and explicit dependencies;
   - cross-issue blockers and prerequisite proofs;
   - phase breakdown across the whole stack;
   - leaf implementation/proof/closeout tasks;
   - which todo starts each issue's implementation work.
4. Create or update the todo graph as an auditable hierarchy:
   - one epic/root todo for the whole stack;
   - phase todos under the epic or linked to it;
   - per-issue parent todos;
   - leaf todos for implementation, validation/proofs, documentation/commit, and closeout;
   - blockers/dependencies between todos using Solo blockers when available, or explicit markdown links/`blocked_by` fields in fallback mode;
   - stable tags/metadata such as `issue-stack`, `ISSUE-NNN`, `epic`, `phase`, `leaf`, and a run-specific tag.
5. After todo creation and dependency finalization, create an executional playbook prompt as a Solo scratchpad in Solo mode or as markdown under `scratchpads/` in fallback mode. The playbook must prime autonomous execution and include:
   - resolved issue docs and todo ids/paths;
   - dependency graph;
   - phase order;
   - per-issue goal-start prompt template;
   - required proofs and quality gates;
   - todo status/comment discipline;
   - closeout checklist;
   - recovery rules for ambiguity, blockers, failed validation, and dirty worktrees.
6. Before starting implementation, add an auditable comment/update to the epic todo summarizing the created todo graph and linking the playbook scratchpad/file.
7. Begin execution by creating a new active goal for the first issue in the stack. The goal objective must reference:
   - the issue doc path;
   - all todo ids or markdown todo paths relevant to that issue;
   - the epic/root todo;
   - the playbook scratchpad id/name or markdown path;
   - current blockers/dependencies;
   - required proof commands/artifacts.
8. Repeat the per-issue pattern for subsequent issues only after their dependencies and prior issue closeout gates are satisfied: start/update the active goal for that issue, execute work, update todos as progress changes, add comments/updates before closing todos, run proofs, and then close out.

Solo mode command guidance:

- Use `solo-mcp --instance solo ...` and the project id from `whoami`; do not ask the user for `--instance` or `--project`.
- Inspect capabilities first when uncertain: `solo-mcp --instance solo tools --search todo`, `solo-mcp --instance solo tools --search scratchpad`, and `solo-mcp --instance solo tlo help`.
- Create todos with the highest-level first, then phase/per-issue/leaf todos. Use `solo-mcp --instance solo todo create --project <id> --title "..." --body "..." --tag ...` where supported, or the equivalent raw `todo_create` route if the CLI reports a more exact shape.
- Link dependencies with `todo add-blocker`, `todo set-blockers`, or the equivalent raw routes when supported. If Solo lacks parent/child fields, encode hierarchy and parent ids in todo bodies and tags.
- Create the playbook with `solo-mcp --instance solo scratchpad create --project <id> --name "issue stack execution playbook: ISSUE-..." --file <prompt-file> --tag issue-stack` or the equivalent scratchpad route.
- Add comments with `solo-mcp --instance solo todo comment add <todo_id> --project <id> --body <text>` or `--file <path>`.
- Update status as work progresses. Do not leave todos stale while implementation proceeds.
- Before completing any todo, add at least one auditable comment summarizing the work completed, evidence/proofs, remaining risk, and related commit/artifact paths. Never close a todo without such a comment.

Markdown fallback guidance:

- Represent each todo as a markdown file with frontmatter-like fields: `id`, `title`, `status`, `kind`, `issue`, `parent`, `blocked_by`, `tags`, `proofs`, and `updated`.
- Use deterministic ids such as `STACK-ISSUE-025-EPIC`, `STACK-ISSUE-025-PHASE-01`, `STACK-ISSUE-025-LEAF-IMPLEMENT`.
- Add progress comments as dated `## Comment — <timestamp>` sections before changing `status: done`.
- The playbook markdown file is the scratchpad replacement. Keep it under `scratchpads/` and link it from every relevant todo file.
- Update markdown todo statuses as work progresses just as you would update Solo todos.

Per-issue active goal template:

```text
Create a goal to execute ISSUE-NNN end-to-end as part of issue stack <run_tag>.

Issue doc: <path>
Execution context: <solo instance/project from whoami OR markdown fallback directory>
Epic todo: <Solo id or markdown path>
Issue todo: <Solo id or markdown path>
Related phase/leaf todos: <ids/paths with titles>
Execution playbook scratchpad: <Solo scratchpad id/name or markdown path>
Dependencies satisfied: <yes/no and evidence>
Required proofs/gates: <commands/artifacts from issue doc>

Workflow requirements:
- Update todo statuses as work progresses.
- Add at least one auditable comment/update before closing any todo.
- Keep implementation scoped to this issue unless an explicit dependency requires a narrow shared change.
- Run required gates/proofs and record results in todo comments/markdown updates.
- On completion, close leaf todos, then the issue todo, only after comments/updates and proofs exist.
```

Execution discipline:

- Do not start implementation until the epic/phase/issue/leaf todo graph and playbook scratchpad/artifact exist.
- Do not batch-close todos at the end without progress comments; comments/updates must be attached before each todo closeout.
- Do not rely on a worker's claim of completion. Verify files, tests, proofs, and issue acceptance criteria directly.
- If the worktree is dirty with unfamiliar changes, use the dirty worktree cleanup prompt or stop and report the ambiguity rather than overwriting or discarding changes.
- If an issue cannot be executed safely, mark the relevant todo blocked/in-progress as appropriate, add a comment/update explaining the blocker, and continue only with unblocked independent work.

Completion audit before marking this goal complete:

- Restate the requested stack and all resolved issue docs.
- Provide a prompt-to-artifact checklist proving:
  - execution context was auto-detected via `solo-mcp --instance solo whoami --json` or markdown fallback was justified;
  - every issue selector resolved to a doc;
  - every issue doc was inspected;
  - epic, phase, issue, and leaf todos exist as Solo todos or markdown files;
  - dependency graph/blockers are represented in Solo or markdown metadata;
  - execution playbook scratchpad/file exists and references todo ids/paths, issues, and proofs;
  - each issue start has, or is ready to have, a per-issue active goal objective referencing the doc, todos, and playbook;
  - todo status/comment discipline is encoded in the playbook and followed for any todo already completed;
  - required issue proofs/gates are mapped.
- In Solo mode, inspect state with `todos`, `todo view --full`, `scratchpads`, and `scratchpad read --full` commands as evidence.
- In markdown fallback mode, inspect the generated `todos/` and `scratchpads/` files and verify they are visible with `git status --short --untracked-files=all` plus `git check-ignore -v <artifact-path> || true`.
- Report all created todo ids/paths, dependency edges, scratchpad id/name or file path, active goal objective for the first issue, commands run, remaining blockers, and next issue to execute.

Completion standard:

- For planning-only handoff: the todo graph and playbook scratchpad/artifact exist, the first issue goal has been started, and no implementation has begun before that structure exists.
- For full stack execution: all requested issues satisfy their acceptance criteria and required proofs, all related todos have closeout comments/updates before completion, and final Solo/markdown state plus repository state prove completion.
