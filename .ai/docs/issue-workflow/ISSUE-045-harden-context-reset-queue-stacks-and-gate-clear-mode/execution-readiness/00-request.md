# 00 — Request intake

Issue: `ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode`
Target issue path: `.ai/issues/open/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode.md`
Transcript directory: `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/execution-readiness/`

## Parsed request

Create one execution-ready issue doc for two tightly related remediation topics discovered during manual/live post-completion context-reset probing:

1. Goal queue stacks that summarize context between goals are the main use case; fix the Codex/tool-call desync and stale `pi-goal-queue-steer` loop during post-completion summarize/context-reset navigation with queued follow-up goals.
2. Disable `clear` context reset behind an explicit gate for now because `clear` has little practical advantage over `summarize` and is unsafe in queue/context-reset scenarios.

## Inputs

- Bucket: `open`
- Kind: `fix`
- Requested title: `Harden context reset queue stacks and gate clear mode`
- Next issue number: `ISSUE-045`, selected from repository inventory in `raw/commands.log`.

## Owner/live evidence to ground

- Isolated single-goal clear/summarize paths pass.
- Slash template clear/summarize paths pass.
- Model-tool direct/template structured clear/summarize paths mostly pass.
- Slash `clear` plus queued follow-up eats the queued goal.
- Slash `summarize` plus queued follow-up produced Codex `No tool call found for function call output ...` errors.
- Model-tool `enqueue_goal` / `start_queued_goal` with structured clear produced repeated `pi-goal-queue-steer` branches; the apparent `Operation aborted` messages surfaced after interruption and are symptoms of the loop/interrupt, not the cause.

## Clarification status

No clarification needed. The queue prose references "these two topics", and the immediately preceding owner context identifies the two topics unambiguously.

## Artifact policy

This issue workflow requires durable, repo-visible artifacts under `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/execution-readiness/`.
