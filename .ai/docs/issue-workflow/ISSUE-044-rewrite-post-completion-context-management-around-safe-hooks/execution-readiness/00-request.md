# 00 — Request intake

## Parsed request

Create a canonical execution-ready issue doc for a feature rewrite of pi-goals post-completion context management.

The request is explicitly not to patch the current implementation in place. The requested issue must re-process the feature from scratch as if designing the original implementation around the architecture style discussed with the owner.

## Template inputs

```toon
toon.version: 1
request[1]{bucket,kind,title,next_issue,path}:
  open,feature,"Rewrite post-completion context management around safe hooks",ISSUE-044,".ai/issues/open/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks.md"
```

## Locked owner context from discussion

- Context reset should be an isolated, flagged, best-effort post-completion action/hook.
- Goal/queue continuation must be decided independently from context reset and remain guaranteed in expected auto-continuation scenarios.
- Errors from context reset/post-completion hooks must be contained and must never block queue handoff or goal processing.
- The design should explicitly use recognizable architecture patterns where they matter:
  - Functional Core, Imperative Shell.
  - Anti-Corruption Layer for slash/tool/template/queue input normalization.
  - Command Pattern / Continuation Ticket.
  - In-process Outbox-style continuation capture.
  - Process Manager / Saga-style post-completion orchestration.
  - Ports and Adapters for action runners.
  - Bulkhead isolation for context reset failures.
  - Feature flag / Strategy Pattern for kill-switch/no-op runner selection.
  - Result-type / Railway-style error containment.
- Current implementation may be used as concrete anti-pattern evidence, not as the starting design to preserve.

## Concrete current anti-pattern evidence requested for research

- Directive parsing after template expansion.
- Trailing-only grammar limitations and where trailing is evaluated.
- Tool schema lacking explicit structured post-completion fields.
- Lifecycle reset failure blocking queue handoff.
- `needsPostCompletionContextReset` treating failed reset as pending/interfering.
- Special-case context reset branching spread across lifecycle/tools/queue paths.
- Queue state mixing resolved objectives with optional template metadata.

## Issue number/path choice

- Bucket: `open`.
- Kind: `feature`.
- Next issue number resolved from issue inventory: `ISSUE-044`.
- Slug: `rewrite-post-completion-context-management-around-safe-hooks`.
- Issue path: `.ai/issues/open/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks.md`.
- Artifact directory: `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/execution-readiness/`.

## Clarification status

No clarification needed. Required template inputs are derivable from the queue item and current owner discussion:

- `--bucket open`: new executable feature issue.
- `--kind feature`: requested as a feature rewrite.
- `--title`: derived from locked architecture direction.
- trailing context: supplied by queue item plus immediately preceding design discussion.

## Discovery commands

Recorded in [`raw/commands.log`](raw/commands.log):

- `git status --short --untracked-files=all`
- issue bucket inventory
- recent issue inventory
- next issue number resolution

Note: the first shell attempt included a missing `.ai/issues/refine` path and exited non-zero before the next-issue command; the corrected next-issue command was rerun and recorded in the same log.
