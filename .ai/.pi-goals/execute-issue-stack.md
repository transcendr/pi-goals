---
description: Plan and execute one or more issue docs through Solo todos, dependency graph, playbook scratchpad, and per-issue active goals
aliases: execute-issues,issue-stack,run-issues,solo-issue-stack
usage: /goal issue-stack --project 2 --instance solo-pi_goals -- ISSUE-025 ISSUE-026
examples: /goal execute-issues --project 2 --instance solo-pi_goals -- 25-26; /goal issue-stack --project 2 --instance solo-pi_goals -- ISSUE-012,ISSUE-025,ISSUE-026
allow_commands: true
command_timeout_ms: 10000
command_output_limit: 30000
---
Create a goal to execute an issue or issue stack end-to-end through Solo, with auditable todo decomposition, dependency mapping, a high-level execution playbook scratchpad, per-issue active goals, progress updates, and closeout comments.

<issue_stack_request>
  <solo_instance>{{instance}}</solo_instance>
  <solo_project>{{project}}</solo_project>
  <issue_selector>{{args}}</issue_selector>
</issue_stack_request>

The issue selector may name one issue, a comma/space-separated list, or a numeric range such as `25-27`. Resolve selectors to canonical issue docs under `.ai/issues/**/ISSUE-NNN-*.md` before creating Solo todos. If selector resolution is ambiguous or no matching issue doc exists, ask exactly one focused clarification before mutating Solo state.

Use `$solo-mcp` as the governing Solo CLI workflow. Prefer `solo-mcp --instance <instance> ...` routes. The default project-local instance is `solo-pi_goals`; the default project id is `2` when the user does not provide a different value and `solo-mcp --instance solo-pi_goals projects` confirms this repository path.

Start from these embedded snapshots as initial context, then inspect files directly before creating todos or starting work:

<repo_status>
!`git status --short --untracked-files=all`
</repo_status>

<issue_inventory>
!`find .ai/issues/open .ai/issues/refine .ai/issues/defer .ai/issues/fixed .ai/issues/closed -maxdepth 1 -type f -name 'ISSUE-*.md' 2>/dev/null | sort`
</issue_inventory>

<solo_projects>
!`solo-mcp --instance {{instance}} projects 2>/dev/null || solo-mcp --instance solo-pi_goals projects 2>/dev/null || true`
</solo_projects>

<solo_open_todos>
!`solo-mcp --instance {{instance}} todos --project {{project}} --status open 2>/dev/null || solo-mcp --instance solo-pi_goals todos --project 2 --status open 2>/dev/null || true`
</solo_open_todos>

Required planning workflow before implementation:

1. Resolve the Solo instance and project id, verifying the project path matches the current repository when possible.
2. Resolve every requested issue selector to an actual issue doc path. Read every issue doc fully enough to extract goal, scope, acceptance criteria, required proofs, dependencies, risks, and quality gates.
3. Build a full execution stack model covering 1..N issues:
   - issue order and explicit dependencies;
   - cross-issue blockers and prerequisite proofs;
   - phase breakdown across the whole stack;
   - leaf implementation/proof/closeout tasks;
   - which todo starts each issue's implementation work.
4. Create or update Solo todos to represent the stack as an auditable hierarchy:
   - one epic/root todo for the whole stack;
   - phase todos under the epic or tagged/linked to it;
   - per-issue parent todos;
   - leaf todos for implementation, validation/proofs, documentation/commit, and closeout;
   - blockers/dependencies between todos using Solo blockers when available and explicit body links when hierarchy fields are unavailable;
   - stable tags such as `issue-stack`, `ISSUE-NNN`, `epic`, `phase`, `leaf`, and a run-specific tag.
5. After todo creation and dependency finalization, create a Solo scratchpad containing an executional playbook prompt for this stack. The playbook must prime autonomous execution and include:
   - resolved issue docs and todo ids;
   - dependency graph;
   - phase order;
   - per-issue goal-start prompt template;
   - required proofs and quality gates;
   - todo status/comment discipline;
   - closeout checklist;
   - recovery rules for ambiguity, blockers, failed validation, and dirty worktrees.
6. Before starting implementation, add an auditable comment to the epic todo summarizing the created todo graph and linking the playbook scratchpad.
7. Begin execution by creating a new active goal for the first issue in the stack. The goal objective must reference:
   - the issue doc path;
   - all Solo todo ids relevant to that issue;
   - the epic/root todo;
   - the playbook scratchpad id/name;
   - current blockers/dependencies;
   - required proof commands/artifacts.
8. Repeat the per-issue pattern for subsequent issues only after their dependencies and prior issue closeout gates are satisfied: start/update the active goal for that issue, execute work, update Solo todos as progress changes, add comments before closing todos, run proofs, and then close out.

Solo command guidance:

- Inspect capabilities first when uncertain: `solo-mcp --instance <instance> tools --search todo`, `solo-mcp --instance <instance> tools --search scratchpad`, and `solo-mcp --instance <instance> tlo help`.
- Create todos with the highest-level first, then phase/per-issue/leaf todos. Use `solo-mcp --instance <instance> todo create --project <id> --title "..." --body "..." --tag ...` where supported, or the equivalent raw `todo_create` route if the CLI reports a more exact shape.
- Link dependencies with `todo add-blocker`, `todo set-blockers`, or the equivalent raw routes when supported. If Solo lacks parent/child fields, encode hierarchy and parent ids in todo bodies and tags.
- Create the playbook with `solo-mcp --instance <instance> scratchpad create --project <id> --name "issue stack execution playbook: ISSUE-..." --file <prompt-file> --tag issue-stack` or the equivalent scratchpad route.
- Add comments with `solo-mcp --instance <instance> todo comment add <todo_id> --project <id> --body <text>` or `--file <path>`.
- Update status as work progresses. Do not leave todos stale while implementation proceeds.
- Before completing any todo, add at least one auditable comment summarizing the work completed, evidence/proofs, remaining risk, and related commit/artifact paths. Never close a todo without such a comment.

Per-issue active goal template:

```text
Create a goal to execute ISSUE-NNN end-to-end as part of issue stack <run_tag>.

Issue doc: <path>
Solo instance/project: <instance>/<project>
Epic todo: <id>
Issue todo: <id>
Related phase/leaf todos: <ids with titles>
Execution playbook scratchpad: <id/name>
Dependencies satisfied: <yes/no and evidence>
Required proofs/gates: <commands/artifacts from issue doc>

Workflow requirements:
- Update Solo todo statuses as work progresses.
- Add at least one auditable comment before closing any todo.
- Keep implementation scoped to this issue unless an explicit dependency requires a narrow shared change.
- Run required gates/proofs and record results in todo comments.
- On completion, close leaf todos, then the issue todo, only after comments and proofs exist.
```

Execution discipline:

- Do not start implementation until the epic/phase/issue/leaf todo graph and playbook scratchpad exist.
- Do not batch-close todos at the end without progress comments; comments must be attached before each todo closeout.
- Do not rely on a worker's claim of completion. Verify files, tests, proofs, and issue acceptance criteria directly.
- If the worktree is dirty with unfamiliar changes, use the dirty worktree cleanup prompt or stop and report the ambiguity rather than overwriting or discarding changes.
- If an issue cannot be executed safely, mark the relevant todo blocked/in-progress as appropriate, add a comment explaining the blocker, and continue only with unblocked independent work.

Completion audit before marking this goal complete:

- Restate the requested stack and all resolved issue docs.
- Provide a prompt-to-artifact checklist proving:
  - Solo instance/project was verified;
  - every issue selector resolved to a doc;
  - every issue doc was inspected;
  - epic, phase, issue, and leaf todos exist;
  - dependency graph/blockers are represented in Solo;
  - execution playbook scratchpad exists and references todo ids/issues/proofs;
  - each issue start has, or is ready to have, a per-issue active goal objective referencing the doc, todos, and playbook;
  - todo status/comment discipline is encoded in the playbook and followed for any todo already completed;
  - required issue proofs/gates are mapped.
- Inspect Solo state with `todos`, `todo view --full`, `scratchpads`, and `scratchpad read --full` commands as evidence.
- Report all created todo ids, dependency edges, scratchpad id/name, active goal objective for the first issue, commands run, remaining blockers, and next issue to execute.

Completion standard:

- For planning-only handoff: the Solo todo graph and playbook scratchpad exist, the first issue goal has been started, and no implementation has begun before that structure exists.
- For full stack execution: all requested issues satisfy their acceptance criteria and required proofs, all related todos have closeout comments before completion, and final Solo state plus repository state prove completion.
