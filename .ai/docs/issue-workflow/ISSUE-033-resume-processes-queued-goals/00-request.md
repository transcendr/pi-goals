# 00 — Request

## Parsed request

Create a new canonical issue doc for a feature/fix in `pi-goals`:

- `/goal resume` should be useful when queued goals exist even if there is no active paused goal.
- Two idle states should trigger queue processing:
  - no goal loaded at all;
  - an uncleared completed goal is present.
- Queueing must remain distinct from starting: `/goal queue ...` enqueues only, and does not immediately advance goals.
- `/goal resume` is the explicit user action that should start an agent turn to resolve queued goals.

## Resolved issue inputs

- target bucket: `open`
- issue kind: `feature`
- requested title: `Resume processes queued goals from idle state`
- issue id/path: `.ai/issues/open/ISSUE-033-resume-processes-queued-goals.md`
- transcript directory: `.ai/docs/issue-workflow/ISSUE-033-resume-processes-queued-goals/`

## Assumptions

- This is a first-class behavior issue, not an immediate implementation request.
- The behavior should preserve the existing queue-steering model: the agent resolves queue heads using steering/template tools, not extension-side prose parsing.
- No destructive git actions are needed.
