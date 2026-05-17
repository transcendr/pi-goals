# 00 Request — ISSUE-046 Untruncated goal queue listing for agents

## Parsed request

- Target repo: `/Users/bryan/dev/personal/experiments/pi-goals`
- Target bucket: `open`
- Issue kind: `fix`
- Requested title: `Untruncated goal queue listing for agents`
- Issue number selected: `ISSUE-046`
- Issue path: `.ai/issues/open/ISSUE-046-untruncated-goal-queue-listing-for-agents.md`
- Transcript directory: `.ai/docs/issue-workflow/ISSUE-046-untruncated-goal-queue-listing-for-agents/execution-readiness/`

## Request context

The user asked to create an issue in `pi-goals` because the `list_goal_queue` tool output shown to agents truncates long queued objectives. Agents can see only ellipsized text such as `In /Users/bryan/dev/…`, even though the complete objective is available in tool result details and persisted `pi-goal-state` session JSONL. The issue should cover a design for exposing full queued goal contents, or an explicit non-truncated/details mode, while keeping UI output manageable.

## Required evidence to include

- Evidence from the Pinotator session where `list_goal_queue` returned truncated objectives.
- Evidence that the full queued objective had to be reconstructed from persisted session JSONL/tool details.
- API/tool output design considerations.
- Backward compatibility and token-safety/truncation tradeoffs.
- Acceptance tests.

## Input completeness

No clarification was required. The request includes bucket, kind, title, target repo, problem, desired behavior, evidence source, design constraints, and acceptance-test scope.
