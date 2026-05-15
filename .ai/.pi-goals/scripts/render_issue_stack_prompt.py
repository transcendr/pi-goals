#!/usr/bin/env python3
"""Render the execute-issue-stack goal prompt from the current repo/Solo context."""

from __future__ import annotations

import glob
import json
import os
import re
import subprocess
from dataclasses import dataclass
from typing import Iterable

BUCKETS = ["open", "refine", "defer", "fixed", "closed"]
REPO_STATUS_MAX_LINES = 60
REPO_STATUS_MAX_CHARS = 3000


@dataclass(frozen=True)
class IssueDoc:
    num: int
    issue: str
    slug: str
    path: str
    workflow_dir: str


@dataclass(frozen=True)
class SoloContext:
    project_id: str
    project_name: str
    project_path: str


def run_text(args: list[str], timeout: float = 5.0) -> str:
    try:
        return subprocess.check_output(
            args, stderr=subprocess.DEVNULL, text=True, timeout=timeout
        )
    except Exception:
        return ""


def repo_status() -> str:
    status = run_text(
        ["git", "status", "--short", "--untracked-files=all"], timeout=3
    ).strip()
    if not status:
        return "clean: true"

    lines = status.splitlines()
    tracked = [line for line in lines if not line.startswith("?? ")]
    untracked = [line for line in lines if line.startswith("?? ")]
    ordered_sample = tracked + untracked
    sample_lines: list[str] = []
    sample_chars = 0
    for line in ordered_sample:
        next_chars = sample_chars + len(line) + 1
        if (
            len(sample_lines) >= REPO_STATUS_MAX_LINES
            or next_chars > REPO_STATUS_MAX_CHARS
        ):
            break
        sample_lines.append(line)
        sample_chars = next_chars

    counts = {
        "modified": sum(1 for line in lines if "M" in line[:2]),
        "added": sum(1 for line in lines if "A" in line[:2]),
        "deleted": sum(1 for line in lines if "D" in line[:2]),
        "renamed": sum(1 for line in lines if "R" in line[:2]),
        "untracked": len(untracked),
    }
    summary = [
        "dirty: true",
        f"status_total_lines: {len(lines)}",
        "status_counts:",
        *(f"  {key}: {value}" for key, value in counts.items()),
        "status_sample:",
        *sample_lines,
    ]
    if len(sample_lines) < len(lines):
        summary.append(
            f"[git status truncated: showing {len(sample_lines)} of {len(lines)} lines; "
            f"tracked lines are shown before untracked lines; max {REPO_STATUS_MAX_CHARS} chars]"
        )
    return "\n".join(summary)


def detect_solo_context() -> SoloContext | None:
    if os.environ.get("PI_GOAL_FORCE_MARKDOWN"):
        return None
    raw = run_text(["solo-mcp", "--instance", "solo", "whoami", "--json"], timeout=5)
    if not raw.strip():
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None
    project = data.get("project") or {}
    project_id = project.get("effective_id") or project.get("id")
    if not project_id:
        return None
    return SoloContext(
        project_id=str(project_id),
        project_name=str(project.get("effective_name") or project.get("name") or ""),
        project_path=str(project.get("effective_path") or project.get("path") or ""),
    )


def discover_issue_docs() -> list[IssueDoc]:
    docs: list[IssueDoc] = []
    for bucket in BUCKETS:
        for path in sorted(glob.glob(f".ai/issues/{bucket}/ISSUE-*.md")):
            match = re.search(r"ISSUE-(\d+)-([^/]+)\.md$", path)
            if not match:
                continue
            num = int(match.group(1))
            issue = f"ISSUE-{num:03d}"
            slug = match.group(2)
            docs.append(
                IssueDoc(
                    num=num,
                    issue=issue,
                    slug=slug,
                    path=path,
                    workflow_dir=f".ai/docs/issue-workflow/{issue}-{slug}",
                )
            )
    return docs


def parse_issue_numbers(selector: str) -> list[int]:
    nums: list[int] = []
    covered_spans: list[tuple[int, int]] = []
    range_re = re.compile(
        r"(?i)(?:issue[- ]*)?(\d{1,3})\s*(?:-|through|to|\.\.)\s*(?:issue[- ]*)?(\d{1,3})"
    )
    for match in range_re.finditer(selector):
        lo, hi = sorted((int(match.group(1)), int(match.group(2))))
        nums.extend(range(lo, hi + 1))
        covered_spans.append(match.span())

    single_re = re.compile(r"(?i)(?:issue[- ]*)?(\d{1,3})")
    for match in single_re.finditer(selector):
        if any(
            start <= match.start() and match.end() <= end
            for start, end in covered_spans
        ):
            continue
        nums.append(int(match.group(1)))

    seen: set[int] = set()
    ordered: list[int] = []
    for num in nums:
        if num not in seen:
            ordered.append(num)
            seen.add(num)
    return ordered


def resolve_issues(selector: str) -> tuple[list[IssueDoc], list[str], str | None]:
    numbers = parse_issue_numbers(selector)
    if not numbers:
        return [], [], "no issue numbers found in request"
    by_num: dict[int, IssueDoc] = {}
    for doc in discover_issue_docs():
        by_num.setdefault(doc.num, doc)
    missing = [f"ISSUE-{num:03d}" for num in numbers if num not in by_num]
    chosen = [by_num[num] for num in numbers if num in by_num]
    return chosen, missing, None


def stack_id(issues: Iterable[IssueDoc]) -> str:
    return "issue-stack-" + "-".join(issue.issue for issue in issues)


def list_existing_relevant_todos(
    ctx: SoloContext, issues: list[IssueDoc], stack: str
) -> str:
    output = run_text(
        [
            "solo-mcp",
            "--instance",
            "solo",
            "todos",
            "--project",
            ctx.project_id,
            "--status",
            "open",
        ],
        timeout=5,
    )
    if not output.strip():
        return "none"
    needles = [stack, *[issue.issue for issue in issues]]
    relevant = [
        line
        for line in output.splitlines()
        if any(needle in line for needle in needles)
    ]
    return "\n".join(relevant) if relevant else "none"


def bullet_issue_stack(issues: list[IssueDoc]) -> str:
    lines = []
    for issue in issues:
        lines.extend(
            [
                f"- {issue.issue}: {issue.path}",
                f"  - workflow dir: {issue.workflow_dir}",
            ]
        )
    return "\n".join(lines)


def default_edges(issues: list[IssueDoc]) -> str:
    lines = [
        "- Within each issue: implementation leaf -> validation/proofs leaf -> closeout leaf."
    ]
    for previous, current in zip(issues, issues[1:]):
        lines.append(
            f"- Cross-issue: {previous.issue} closeout leaf blocks {current.issue} implementation leaf."
        )
    return "\n".join(lines)


def indent(text: str, prefix: str = "  ") -> str:
    return "\n".join(f"{prefix}{line}" if line else line for line in text.splitlines())


def per_issue_goal_templates_solo(
    issues: list[IssueDoc], stack: str, ctx: SoloContext
) -> str:
    blocks: list[str] = []
    for index, issue in enumerate(issues, start=1):
        dependency = (
            "none beyond stack planning/playbook completion"
            if index == 1
            else f"{issues[index - 2].issue} closeout leaf is complete with proof comments"
        )
        blocks.append(f"""### {issue.issue} active goal objective

Start this goal only after the Solo epic, phase todos, {issue.issue} issue todo, {issue.issue} leaf todos, dependency blockers, and `{stack} playbook` scratchpad exist.

```text
Execute {issue.issue} end-to-end as part of {stack}.

Issue doc: {issue.path}
Solo: --instance solo --project {ctx.project_id} {ctx.project_name}
Workflow dir for audit evidence: {issue.workflow_dir}
Epic todo: <fill with created Solo epic todo id>
Phase todos: <fill with created Solo phase todo ids>
Issue todo: <fill with created {issue.issue} parent todo id>
Leaf todos: <fill with created implementation, validation/proofs, and closeout leaf todo ids>
Execution playbook: <fill with Solo scratchpad id/name for `{stack} playbook`>
Dependencies satisfied: {dependency}; verify with todo comments and blocker state before starting.
Required proofs/gates: extract from {issue.path} before implementation and list exact commands/artifacts here.

Execution rules:
- update Solo todo status as work progresses;
- add an auditable comment before closing any todo;
- run and record required proofs in leaf todo comments;
- close leaf todos before the {issue.issue} parent todo;
- keep implementation scoped to {issue.issue} unless the issue doc proves a shared dependency is required.
```
""")
    return "\n".join(blocks)


def per_issue_goal_templates_markdown(issues: list[IssueDoc], stack: str) -> str:
    blocks: list[str] = []
    for index, issue in enumerate(issues, start=1):
        dependency = (
            "none beyond stack planning/playbook completion"
            if index == 1
            else f"{issues[index - 2].issue} closeout todo is done with proof comment"
        )
        blocks.append(f"""### {issue.issue} active goal objective

Start this goal only after the markdown epic, phase todos, {issue.issue} issue todo, {issue.issue} leaf todos, dependency links, and stack playbook file exist.

```text
Execute {issue.issue} end-to-end as part of {stack}.

Issue doc: {issue.path}
Markdown workflow dir: {issue.workflow_dir}
Epic todo: {issues[0].workflow_dir}/todos/{stack}-EPIC.md
Phase todos: {issues[0].workflow_dir}/todos/{stack}-PHASE-*.md
Issue todo: {issue.workflow_dir}/todos/{issue.issue}-ISSUE.md
Leaf todos: {issue.workflow_dir}/todos/{issue.issue}-IMPLEMENTATION.md, {issue.workflow_dir}/todos/{issue.issue}-VALIDATION.md, {issue.workflow_dir}/todos/{issue.issue}-CLOSEOUT.md
Execution playbook: {issues[0].workflow_dir}/scratchpads/{stack}-PLAYBOOK.md
Dependencies satisfied: {dependency}; verify in todo comments before starting.
Required proofs/gates: extract from {issue.path} before implementation and list exact commands/artifacts here.

Execution rules:
- update markdown todo status as work progresses;
- append an auditable comment before marking any todo done;
- run and record required proofs in leaf todo comments;
- close leaf todos before the {issue.issue} parent todo;
- keep implementation scoped to {issue.issue} unless the issue doc proves a shared dependency is required.
```
""")
    return "\n".join(blocks)


def render_unresolved(selector: str, missing: list[str], reason: str | None) -> str:
    detail = (
        f"Missing issue docs: {', '.join(missing)}"
        if missing
        else f"Reason: {reason or 'unknown'}"
    )
    return f"""Resolve the requested issue stack before execution.

Request:
{selector.strip() or "(empty)"}

{detail}

No todo graph, scratchpad/playbook, fallback artifact, or implementation work should be created until the selector resolves to concrete issue docs under `.ai/issues/**/ISSUE-NNN-*.md`.

Ask one focused clarification that names the missing or ambiguous issue selector and the available issue numbers closest to the request.
"""


def render_solo(selector: str, issues: list[IssueDoc], ctx: SoloContext) -> str:
    stack = stack_id(issues)
    primary = issues[0].workflow_dir
    issue_names = ", ".join(issue.issue for issue in issues)
    relevant_todos = list_existing_relevant_todos(ctx, issues, stack)
    return f"""Execute {issue_names} end-to-end through Solo.

Request:
{selector.strip()}

Repository status at prompt expansion:
{repo_status()}

Solo context:
- instance: solo
- project: {ctx.project_id} {ctx.project_name}{chr(10) + "- project path: " + ctx.project_path if ctx.project_path else ""}

Issue stack:
- stack_id: {stack}
- primary workflow dir for audit evidence: {primary}
{bullet_issue_stack(issues)}

Existing relevant open Solo todos:
{relevant_todos}

Create in Solo before implementation:
- epic todo: `{stack} epic`
- stack index/coordination todo: `{stack} index`
- required phase todos: `{stack} phase: planning + playbook`, `{stack} phase: implementation`, `{stack} phase: validation + proofs`, `{stack} phase: closeout`
- one parent issue todo for each issue: {", ".join(issue.issue + " parent" for issue in issues)}
- leaf todos for every issue: implementation, validation/proofs, closeout
- dependency edges:
{indent(default_edges(issues))}

Detailed workflow:

1. Read and extract the issue docs.
   Read every issue doc listed above before creating the final todo graph. For each issue, extract the goal, required behavior, non-goals, affected files, acceptance criteria, required proofs, known dependencies, risk notes, and any issue-workflow artifact links. Record these facts in the Solo issue parent todo body and in the playbook scratchpad. If an issue doc contradicts the default dependency order, use the issue doc as the source of truth and encode the dependency explicitly.

2. Design the stack todo graph from the extracted issue facts.
   Keep the graph top-down and auditable: epic -> required phase todos -> per-issue parent todos -> leaf todos. Phase todos are always required; if the stack is small, keep the four default phases above rather than omitting phases. Each todo body should state its parent, child todos expected beneath it, blockers, issue doc path, proof obligations, and tags: `issue-stack`, `{stack}`, the relevant `ISSUE-NNN`, and one of `epic`, `phase`, `issue`, or `leaf`.

3. Create the Solo todos in project {ctx.project_id} before implementation.
   Use `solo-mcp --instance solo ... --project {ctx.project_id}`. Create the epic first, then the stack index, then the phase todos, then issue parents, then leaf todos. Use Solo parent/metadata fields when the route supports them. If a friendly route lacks parent or dependency fields, keep the hierarchy in the todo body and tags, then use blocker routes or raw todo routes for dependency edges instead of dropping the relationship.

4. Encode blockers and dependency edges.
   The planning/playbook phase blocks implementation. Each issue implementation leaf blocks its validation/proofs leaf; validation/proofs blocks closeout. For multi-issue stacks, the previous issue closeout leaf blocks the next issue implementation leaf unless the issue docs justify a different dependency. Add blockers in Solo where supported and duplicate the edge list in the epic, stack index, phase, and affected leaf todo bodies.

5. Create the execution playbook scratchpad after the todo graph is finalized.
   Create one Solo scratchpad named `{stack} playbook`, tagged with `issue-stack` and `{stack}`. The playbook must include the issue order, all created todo ids, dependency edges, required proof commands/artifacts, quality gates, dirty-worktree handling, todo status/comment rules, and the per-issue active goal objectives below. The playbook is the execution primer; implementation starts only after it exists and references the final todo ids.

6. Add the first audit comment before implementation.
   Add a comment to the epic todo summarizing the created graph, phase todos, issue todos, leaf todos, blockers, and playbook scratchpad id/name. Add comments to phase or issue todos when useful to record extracted issue requirements. This establishes the audit trail before code changes begin.

7. Start and execute per-issue active goals sequentially.
   Start the first issue goal only after steps 1-6 are complete. For each later issue, verify dependency blockers and prior closeout comments/proofs before starting its goal. Each issue goal must reference the issue doc, epic todo, phase todos, issue parent todo, leaf todos, playbook scratchpad, dependency status, and required proofs.

{per_issue_goal_templates_solo(issues, stack, ctx)}

8. During implementation, keep Solo state current.
   Move todos to in-progress/blocked/done as reality changes. Do not let implementation progress outrun todo state. Before completing any todo, add an auditable comment with completed work, proof outputs, files/commits/artifacts, remaining risk, and downstream impact. Close leaf todos before parent issue todos; close issue parents before phase closeout; close the epic only after every requested issue is complete.

9. Validate and prove completion.
   Run the exact required proofs from the issue docs plus project quality gates required by `AGENTS.md` for touched code. Record command outputs or artifact paths in validation/proof leaf comments. If validation fails, keep the relevant todo in progress or blocked and add a failure comment with next action.

10. Final audit.
   Inspect Solo with `solo-mcp --instance solo todos --project {ctx.project_id}`, `todo view --full` for the epic/phase/issue/leaf todos, `scratchpads`, and `scratchpad read --full` for the playbook. Report created todo ids, dependency edges, playbook id/name, active goal objectives used, commands run, proofs, commits/artifacts, blockers, and the next issue if any remains.

Completion standard:
Every requested issue satisfies its acceptance criteria and required proofs. Every related Solo todo has at least one audit comment before completion. The playbook scratchpad, Solo todo graph, dependency blockers, final repository state, and proof outputs together demonstrate end-to-end completion.
"""


def render_markdown(selector: str, issues: list[IssueDoc]) -> str:
    stack = stack_id(issues)
    primary = issues[0].workflow_dir
    issue_names = ", ".join(issue.issue for issue in issues)
    dirs = sorted(
        {f"{issue.workflow_dir}/todos" for issue in issues}
        | {f"{issue.workflow_dir}/scratchpads" for issue in issues}
        | {f"{primary}/todos", f"{primary}/scratchpads"}
    )
    mkdirs = "\n".join(f"- {path}" for path in dirs)
    return f"""Execute {issue_names} end-to-end with markdown todo/playbook artifacts.

Request:
{selector.strip()}

Repository status at prompt expansion:
{repo_status()}

Solo is not available for this prompt expansion, so use markdown artifacts in the issue-workflow directories instead of Solo todos and scratchpads.

Issue stack:
- stack_id: {stack}
- primary workflow dir: {primary}
- stack epic todo: {primary}/todos/{stack}-EPIC.md
- stack index todo: {primary}/todos/{stack}-INDEX.md
- stack playbook: {primary}/scratchpads/{stack}-PLAYBOOK.md
{bullet_issue_stack(issues)}

Create these directories before writing artifacts:
{mkdirs}

Create markdown artifacts before implementation:
- epic todo: {primary}/todos/{stack}-EPIC.md
- stack index/coordination todo: {primary}/todos/{stack}-INDEX.md
- required phase todos in {primary}/todos/: planning + playbook, implementation, validation + proofs, closeout
- one parent issue todo for each issue under that issue's `todos/` directory
- leaf todos for every issue: implementation, validation/proofs, closeout
- dependency edges:
{indent(default_edges(issues))}

Detailed workflow:

1. Read and extract the issue docs.
   Read every issue doc listed above before creating the final todo graph. Extract goal, required behavior, non-goals, affected files, acceptance criteria, required proofs, dependencies, risks, and issue-workflow artifact links. Write those facts into the relevant markdown issue parent todo and the stack playbook.

2. Create the markdown todo graph.
   Create the directories listed above, then create the epic, stack index, required phase todos, issue parent todos, and leaf todos. Phase todos are always required; use the four default phases even for a single small issue. Each todo file must state parent, children, blockers, issue doc path, proof obligations, tags, and current status.

3. Encode dependency edges in files.
   Put `blocked_by` entries in frontmatter and also describe the same edges in the body. The planning/playbook phase blocks implementation. Each implementation leaf blocks validation/proofs; validation/proofs blocks closeout. For multi-issue stacks, the previous issue closeout todo blocks the next issue implementation todo unless the issue docs prove another order.

4. Create the stack playbook before implementation.
   Write {primary}/scratchpads/{stack}-PLAYBOOK.md after the todo graph is finalized. Include issue order, todo paths, dependency graph, required proofs, quality gates, dirty-worktree handling, todo status/comment rules, and the per-issue active goal objectives below.

5. Add initial audit comments before implementation.
   Every markdown todo starts with an initial `## Comment — <ISO-8601 timestamp>` section summarizing why it exists and how it maps to the graph. The epic comment must summarize the whole graph and playbook path.

6. Start and execute per-issue active goals sequentially.
   Start the first issue goal only after the graph and playbook files exist. For each later issue, verify dependency comments/proofs before starting. Each goal references the issue doc, markdown todo paths, playbook path, dependency status, and required proofs.

{per_issue_goal_templates_markdown(issues, stack)}

7. Keep markdown todo state current during implementation.
   Change statuses as work progresses. Before setting any todo to `done`, append a fresh closeout comment with completed work, proof outputs, files/commits/artifacts, remaining risk, and downstream impact. Close leaf todos before issue parents and parents before the epic.

8. Validate and prove completion.
   Run required issue proofs and project quality gates for touched code. Record command outputs or artifact paths in validation/proof todo comments. If validation fails, keep the relevant todo in progress or blocked and add a failure comment with next action.

9. Final audit.
   Inspect generated `todos/` and `scratchpads/` files, run `git status --short --untracked-files=all`, and run `git check-ignore -v <one-created-path> || true`. Report todo paths, dependency edges, playbook path, active goal objectives used, commands run, proofs, commits/artifacts, blockers, and the next issue if any remains.

Markdown todo file schema:

```markdown
---
id: <path-derived deterministic id, e.g. ISSUE-026-IMPLEMENTATION>
title: <specific title>
status: pending|in_progress|blocked|done
kind: epic|phase|issue|implementation|validation|closeout
issue: ISSUE-NNN
stack_id: {stack}
parent: <todo id/path>
blocked_by: [<todo ids/paths>]
tags: [issue-stack, {stack}, ISSUE-NNN, leaf]
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

Completion standard:
Every requested issue satisfies its acceptance criteria and required proofs. Every related markdown todo has a closeout comment before `status: done`. The playbook file, todo graph, dependency links, final repository state, and proof outputs together demonstrate end-to-end completion.
"""


def main() -> None:
    selector = os.environ.get("ISSUE_SELECTOR", "")
    issues, missing, reason = resolve_issues(selector)
    if missing or reason or not issues:
        print(render_unresolved(selector, missing, reason))
        return
    ctx = detect_solo_context()
    if ctx:
        print(render_solo(selector, issues, ctx))
    else:
        print(render_markdown(selector, issues))


if __name__ == "__main__":
    main()
