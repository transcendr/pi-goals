# 00 — Request Intake

## Parsed request

- Target bucket: `open`
- Issue kind: `feature`
- Requested title: `Prose queue orchestration guidance`
- Selected issue id: `ISSUE-032`
- Slug: `prose-queue-orchestration-guidance`
- Canonical issue path: `.ai/issues/open/ISSUE-032-prose-queue-orchestration-guidance.md`
- Transcript directory: `.ai/docs/issue-workflow/ISSUE-032-prose-queue-orchestration-guidance/`

## User-provided context

Create an execution-ready issue for making queued-goal steering treat prose/JIT orchestration as a first-class workflow without brittle prose parsing or unnecessary specialized tools. The issue should require unconditional `queueSteeringContent` guidance for direct queued goals versus prose orchestration instructions. It must cover cases where a queued item asks the agent to create/start one or more goals from current context, such as:

- create a `deslop-commit-range` goal after a previous issue stack lands commits;
- create an `execute-issue-stack` goal after a previous `create-issue-doc` goal reveals a new issue ID.

## Assumptions locked for issue creation

- Flexible prose queue items are intentional product behavior, not a gap to eliminate.
- No parser heuristics should try to detect orchestration prose.
- First-pass design should prefer the existing small tool set:
  - `start_queued_goal` for direct queued goals;
  - `create_goal` / `create_goal_from_template` / `enqueue_goal` for JIT orchestration;
  - `dequeue_goal` only after the orchestration queue item has been satisfied.
- Guidance must explicitly allow the agent to create as many consecutive active goals as needed to satisfy one prose/JIT queue item before dequeuing that queue item.

## Clarification status

No clarification needed: bucket, kind, title, and context are explicit.

## Intake evidence

Initial command transcript was started in `raw/commands.log` and confirms:

- current next issue number: `ISSUE-032`;
- issue buckets exist;
- artifact path is visible as an untracked file.
