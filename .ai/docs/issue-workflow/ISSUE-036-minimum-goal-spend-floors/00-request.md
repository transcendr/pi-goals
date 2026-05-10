# 00 — Request intake

## Parsed request

- Template: `create-issue-doc`
- Target bucket: `open`
- Issue kind: `feature`
- Requested title: `Minimum goal spend floors`
- Requested context: Design and prepare end to end a `pi-goals` feature that is the opposite of token/time budget: it defines a minimum number of tokens or minimum amount of time that can be spent before work on a goal can begin to wrap up. Include a live probe validation agent test design to validate it.

## Issue number and path choice

- Existing issue inventory highest number before this workflow: `ISSUE-035`
- Chosen new issue number: `ISSUE-036`
- Slug: `minimum-goal-spend-floors`
- Planned issue path: `.ai/issues/open/ISSUE-036-minimum-goal-spend-floors.md`
- Transcript artifact directory: `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/`

## Clarification / authorization trail

The session initially had an active orchestration goal with the same high-level request. The user explicitly corrected the workflow with: "you must create teh goal from template". A `create_goal_from_template` attempt failed because a goal was already active. I asked whether to replace the active orchestration goal with the concrete template goal, and the user selected `Replace it`. I then cleared the orchestration goal and created this concrete `create-issue-doc` template goal.

## Assumptions

- Bucket `open` is appropriate because this is a new feature issue to prepare for later implementation.
- Kind `feature` is explicit from the request.
- Title `Minimum goal spend floors` is a compact label for the requested minimum-token/minimum-time counterpart to existing maximum budgets.
- This issue is intended to be execution-ready for implementation and proof-driven closeout, not merely a research note.

## Initial repo observations

- `git status --short --untracked-files=all` at intake showed pre-existing changes: `.gitignore` modified and `.ai/docs/monitor-semantics-steering-latency-prototype.md` untracked.
- This workflow created `.ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/raw/commands.log` as the first durable artifact.

## Commands logged

See `raw/commands.log` for the initial status, issue inventory, and issue-number discovery commands.
