---
description: Execute one or more issue docs with a resolved Solo/markdown todo graph, playbook, and per-issue active goals
aliases: execute-issues,issue-stack,run-issues,solo-issue-stack
usage: /goal issue-stack -- ISSUE-025 ISSUE-026
examples: /goal execute-issues -- 25-26; /goal issue-stack -- ISSUE-012,ISSUE-025,ISSUE-026
allow_commands: true
command_timeout_ms: 10000
command_output_limit: 30000
---
Create a goal to execute the resolved issue stack end-to-end with an auditable todo graph, dependency mapping, execution playbook, per-issue active goals, progress updates, required proofs, and closeout comments.

<issue_stack_request>
{{args}}
</issue_stack_request>

Do not ask the user for Solo `--instance` or `--project`. This prompt resolves those automatically. Do not manually invent workflow directory slugs, todo ids, run tags, or scratchpad names when the resolved tables below provide them.

<repo_status>
!`git status --short --untracked-files=all`
</repo_status>

<resolved_execution_context>
!`solo-mcp --instance solo whoami --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{try{const j=JSON.parse(s||"{}");const p=j.project||{};const id=p.effective_id??p.id??"";const name=p.effective_name??p.name??"";const path=p.effective_path??p.path??"";if(id){console.log("mode: solo");console.log("instance: solo");console.log("project_id: "+id);if(name) console.log("project_name: "+name);if(path) console.log("project_path: "+path);}else{console.log("mode: markdown");console.log("reason: solo whoami returned no effective project");}}catch(e){console.log("mode: markdown");console.log("reason: solo whoami unavailable or not json");}})' || printf 'mode: markdown\nreason: solo whoami command failed\n'`
</resolved_execution_context>

<resolved_issue_stack>
!`ISSUE_SELECTOR="{{args}}" node <<'NODE'
const fs = require('fs');
const path = require('path');
const selector = process.env.ISSUE_SELECTOR || '';
const roots = ['.ai/issues/open','.ai/issues/refine','.ai/issues/defer','.ai/issues/fixed','.ai/issues/closed'];
const docs = [];
for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  for (const name of fs.readdirSync(root)) {
    const match = name.match(/^ISSUE-(\d+)-(.+)\.md$/);
    if (match) docs.push({ num: Number(match[1]), issue: `ISSUE-${match[1]}`, slug: match[2], path: path.join(root, name) });
  }
}
docs.sort((a,b) => a.num - b.num || a.path.localeCompare(b.path));
const requested = new Set();
for (const r of selector.matchAll(/(?:ISSUE-)?(\d{1,3})\s*-\s*(?:ISSUE-)?(\d{1,3})/gi)) {
  const a = Number(r[1]); const b = Number(r[2]); const lo = Math.min(a,b); const hi = Math.max(a,b);
  for (let n = lo; n <= hi; n++) requested.add(n);
}
const withoutRanges = selector.replace(/(?:ISSUE-)?\d{1,3}\s*-\s*(?:ISSUE-)?\d{1,3}/gi, ' ');
for (const r of withoutRanges.matchAll(/(?:ISSUE-)?(\d{1,3})(?=\D|$)/gi)) requested.add(Number(r[1]));
const nums = [...requested].sort((a,b)=>a-b);
if (nums.length === 0) {
  console.log('resolution_status: missing_selector');
  console.log('action: ask_one_clarification_for_issue_numbers');
  process.exit(0);
}
const stack = [];
const missing = [];
const ambiguous = [];
for (const num of nums) {
  const matches = docs.filter(d => d.num === num);
  if (matches.length === 0) { missing.push(`ISSUE-${String(num).padStart(3,'0')}`); continue; }
  if (matches.length > 1) { ambiguous.push(`ISSUE-${String(num).padStart(3,'0')}:${matches.map(m=>m.path).join('|')}`); continue; }
  stack.push(matches[0]);
}
if (missing.length || ambiguous.length) {
  console.log('resolution_status: blocked');
  if (missing.length) console.log('missing: '+missing.join(','));
  if (ambiguous.length) console.log('ambiguous: '+ambiguous.join(','));
  console.log('action: ask_one_clarification_before_mutating_state');
  process.exit(0);
}
const issueNums = stack.map(d => String(d.num).padStart(3,'0'));
const stackId = `issue-stack-${issueNums.join('-')}`;
const first = stack[0];
const primaryWorkflow = `.ai/docs/issue-workflow/${first.issue}-${first.slug}`;
console.log('resolution_status: ok');
console.log('stack_id: '+stackId);
console.log('primary_issue: '+first.issue);
console.log('primary_workflow_dir: '+primaryWorkflow);
console.log('stack_index_path: '+`${primaryWorkflow}/todos/issue-stack-index.md`);
console.log('stack_playbook_path: '+`${primaryWorkflow}/scratchpads/${stackId}-playbook.md`);
console.log('stack_epic_markdown_path: '+`${primaryWorkflow}/todos/00-${stackId}-epic.md`);
console.log('issues['+stack.length+']{issue,path,slug,workflow_dir,todos_dir,scratchpads_dir,issue_todo,implementation_todo,validation_todo,closeout_todo}:');
for (const d of stack) {
  const wf = `.ai/docs/issue-workflow/${d.issue}-${d.slug}`;
  console.log(`  ${d.issue},${d.path},${d.slug},${wf},${wf}/todos,${wf}/scratchpads,${wf}/todos/10-${d.issue}-issue.md,${wf}/todos/20-${d.issue}-implementation.md,${wf}/todos/30-${d.issue}-validation.md,${wf}/todos/40-${d.issue}-closeout.md`);
}
console.log('default_dependency_edges: sequential_issue_closeout_blocks_next_issue_implementation');
const markdownDirs = [`${primaryWorkflow}/todos`,`${primaryWorkflow}/scratchpads`,...stack.flatMap(d=>[`.ai/docs/issue-workflow/${d.issue}-${d.slug}/todos`,`.ai/docs/issue-workflow/${d.issue}-${d.slug}/scratchpads`])].filter((v,i,a)=>a.indexOf(v)===i);
console.log('markdown_dirs_to_create['+markdownDirs.length+']:\n  '+markdownDirs.join('\n  '));
NODE`
</resolved_issue_stack>

<solo_open_todos_if_solo_mode>
!`PROJECT_ID=$(solo-mcp --instance solo whoami --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{try{const j=JSON.parse(s); const id=j.project?.effective_id ?? j.project?.id; if(id) process.stdout.write(String(id));}catch{}})' 2>/dev/null); if [ -n "$PROJECT_ID" ]; then solo-mcp --instance solo todos --project "$PROJECT_ID" --status open 2>/dev/null || true; else printf 'not_applicable: markdown_mode\n'; fi`
</solo_open_todos_if_solo_mode>

Context and path decisions are already resolved above:

- If `resolved_execution_context.mode` is `solo`, use `solo-mcp --instance solo` and the injected `project_id` exactly.
- If mode is `markdown`, do not attempt to create Solo todos or scratchpads. Use the exact markdown paths from `resolved_issue_stack`.
- If `resolved_issue_stack.resolution_status` is not `ok`, ask exactly one focused clarification and do not mutate Solo or write fallback artifacts.
- In markdown mode, create exactly the listed `markdown_dirs_to_create` directories before writing todo/playbook files.
- The workflow directory slug is already computed from the issue filename. Do not replace it with a hand-written contextual slug unless the issue doc itself is renamed first.

Required planning workflow before implementation:

1. Confirm the injected context and issue resolution are usable. Re-run only if the worktree or issue files changed after prompt expansion.
2. Read every resolved issue doc listed in `resolved_issue_stack.issues[]`; extract goal, scope, acceptance criteria, required proofs, dependencies, risks, and quality gates.
3. Build the execution stack using the injected `stack_id`, issue order, and paths. Add issue-specific dependency edges only when the issue docs prove they exist; otherwise use the injected default sequential edge: each issue closeout blocks the next issue implementation.
4. Create the todo graph before implementation:
   - stack epic/root;
   - stack index;
   - phase todos when the issue docs imply meaningful phases;
   - one issue parent todo per issue;
   - implementation, validation/proof, and closeout leaf todos per issue;
   - dependency/blocker links from the resolved graph;
   - metadata/tags: `issue-stack`, injected `stack_id`, each `ISSUE-NNN`, `epic`, `phase`, `issue`, `leaf`.
5. Create the execution playbook after the todo graph is finalized and before implementation starts. Use the injected playbook path/name in markdown mode, or create a Solo scratchpad with name `<stack_id> playbook` in Solo mode.
6. Add an auditable comment/update to the epic/root todo before implementation. It must summarize the todo graph, dependency edges, and playbook id/path.
7. Start the first per-issue active goal only after steps 1-6 are complete. The goal objective must include the issue doc path, issue todo, leaf todos, epic/root todo, playbook id/path, dependency status, and required proofs.
8. For each subsequent issue, start a new active goal only after dependencies and prior closeout gates are verified.

Solo mode exact command pattern:

- Use `solo-mcp --instance solo ... --project <injected_project_id>`.
- Create top-down todos. If the friendly route lacks a field, inspect `solo-mcp --instance solo tools --search todo` and use the matching raw route rather than dropping metadata.
- Use blockers for dependency edges when supported: prior closeout leaf blocks next issue implementation leaf.
- Add comments with `solo-mcp --instance solo todo comment add <todo_id> --project <injected_project_id> --body <text>` or `--file <path>`.
- Create the playbook scratchpad with the scratchpad route, tagged with `issue-stack` and the injected `stack_id`.
- Before completing any todo, add at least one comment containing completed work, evidence/proof outputs, remaining risk, and related commit/artifact paths.

Markdown fallback exact file schema:

- Stack epic: injected `stack_epic_markdown_path`.
- Stack index: injected `stack_index_path`.
- Stack playbook/scratchpad replacement: injected `stack_playbook_path`.
- Per issue files: use the `issue_todo`, `implementation_todo`, `validation_todo`, and `closeout_todo` paths from the `issues[]` table.
- Todo files must use this compact schema:

```markdown
---
id: <path-derived deterministic id, e.g. ISSUE-025-IMPLEMENTATION>
title: <specific title>
status: pending|in_progress|blocked|done
kind: epic|phase|issue|implementation|validation|closeout
issue: ISSUE-NNN
stack_id: <injected stack_id>
parent: <todo id/path>
blocked_by: [<todo ids/paths>]
tags: [issue-stack, <stack_id>, ISSUE-NNN, leaf]
proofs: [<commands/artifacts>]
updated: <ISO-8601 timestamp>
---

## Purpose
<why this todo exists>

## Required work
- ...

## Comment — <ISO-8601 timestamp>
Initial creation/update summary.
```

- Before changing `status: done`, append a new `## Comment — <ISO-8601 timestamp>` section with closeout evidence. Never mark a markdown todo done without that comment.
- Verify fallback artifacts with `git status --short --untracked-files=all` and `git check-ignore -v <one-created-path> || true`.

Per-issue active goal template to instantiate with real resolved values:

```text
Create a goal to execute ISSUE-NNN end-to-end as part of <stack_id>.

Issue doc: <resolved issue path>
Execution context: <solo: instance solo, project id/name OR markdown fallback primary_workflow_dir>
Epic/root todo: <Solo id or injected stack_epic_markdown_path>
Issue todo: <Solo id or injected issue_todo path>
Leaf todos: <implementation, validation, closeout ids/paths>
Execution playbook: <Solo scratchpad id/name or injected stack_playbook_path>
Dependencies satisfied: <yes/no and evidence>
Required proofs/gates: <commands/artifacts from issue doc>

Workflow requirements:
- Update todo statuses as work progresses.
- Add at least one auditable comment/update before closing any todo.
- Keep implementation scoped to this issue unless an explicit dependency requires a narrow shared change.
- Run required gates/proofs and record results in todo comments/markdown updates.
- Close leaf todos, then the issue todo, only after comments/updates and proofs exist.
```

Execution discipline:

- No implementation before the epic/index/issue/leaf todo graph and playbook exist.
- No batch-close without comments. Every done todo must already contain an audit comment/update.
- Do not trust worker self-report. Verify files, tests, proofs, issue acceptance criteria, and Solo/markdown state directly.
- If the worktree has unfamiliar dirty changes, use the dirty-worktree cleanup prompt or stop and report ambiguity. Do not discard or overwrite changes.
- If an issue is blocked, mark only the relevant todo blocked/in-progress, add a blocker comment/update, and continue only with independent unblocked work.

Completion audit before marking this goal complete:

- Report the injected `stack_id`, execution mode, project id if Solo, primary workflow dir, and every resolved issue doc.
- Prove with commands/files inspected that:
  - execution context was auto-detected from distilled `whoami` output or markdown fallback was selected;
  - all selectors resolved from `resolved_issue_stack`;
  - all issue docs were read;
  - epic/index/issue/leaf todos exist in Solo or at the injected markdown paths;
  - dependency graph/blockers are represented;
  - playbook scratchpad/file exists at the injected id/path and references todos, issues, proofs, and goal template;
  - first per-issue active goal was started only after todo graph + playbook creation;
  - completed todos have comments/updates before closeout;
  - required proofs/gates are mapped and, for executed work, passed.
- In Solo mode, inspect `todos`, `todo view --full`, `scratchpads`, and `scratchpad read --full` using `--instance solo` and injected project id.
- In markdown mode, inspect generated `todos/` and `scratchpads/` files at the injected paths and verify git visibility.
- Report created todo ids/paths, dependency edges, playbook id/path, active goal objective for the current/first issue, commands run, blockers, and next issue.

Completion standard:

- Planning handoff: resolved todo graph and playbook exist, the first issue goal has been started, and no implementation started before those artifacts existed.
- Full execution: every requested issue satisfies acceptance criteria and required proofs, all related todos have closeout comments before completion, and final Solo/markdown plus repository state prove completion.
