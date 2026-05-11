# 03 — Design lock

## Meaningful forks considered

### Fork 1 — Audit execution shape

Options:

1. **Chosen:** `/goal audit` injects a bounded audit steering prompt and triggers an agent turn that produces a visible review.
2. Deterministic local summary only.
3. Reuse the existing continuation prompt.
4. Reuse the churn monitor loop.

Decision: choose option 1.

Rationale: audit is qualitative and evidence-mapping work, so a model turn is appropriate. A deterministic summary cannot inspect arbitrary repo artifacts. Reusing continuation risks accidental continuing/completion. Reusing churn monitor violates ISSUE-020's separation: monitor detects churn; audit reviews completion readiness.

### Fork 2 — Command/tool surface

Options:

1. **Chosen:** add both slash command `/goal audit` and model tool `audit_goal`.
2. Slash command only.
3. Model tool only.

Decision: choose option 1 for execution-ready scope.

Rationale: the user-visible feature is a slash command, but model-tool parity avoids string parsing for natural-language audit requests and makes validation easier.

### Fork 3 — Mutation and continuation behavior

Options:

1. **Chosen:** audit never marks complete and never schedules normal continuation; user/model may explicitly continue or complete afterward.
2. Audit may auto-complete when all evidence is green.
3. Audit behaves as a special continuation turn.

Decision: choose option 1.

Rationale: the issue exists specifically for "audit where we are" without triggering normal continuation or completion. Automatic completion would duplicate proof gates and weaken user control.

### Fork 4 — Persistence

Options:

1. **Chosen first pass:** append a bounded audit custom entry with structured summary metadata; do not store long audit prose on every `GoalState` snapshot.
2. Transcript only.
3. Store full audit history on `GoalState`.

Decision: choose option 1.

Rationale: transcript-only audit is hard to inspect after replay/compaction. Full goal-state storage risks bloat. A separate bounded audit entry supports replay/checkpoint integration later while preserving modular state.

### Fork 5 — Status eligibility

Options:

1. **Chosen:** audit active and paused goals; allow budget-limited/complete audits as read-only review with explicit stale/status wording; reject only absent goals.
2. Audit active goals only.
3. Audit active and paused only.

Decision: choose option 1.

Rationale: users often need an audit after pause, budget limit, or completion to understand current state. The audit prompt must be status-aware and must not resume work.

## Locked first-pass design

- Add `audit` to `/goal` subcommands and autocomplete.
- Add `audit_goal` model tool with empty params or optional focus string.
- Build a dedicated audit prompt in a new or existing prompt module; do not reuse continuation prompt directly.
- Send audit as visible or hidden steering that triggers an agent turn; the resulting response is visible transcript content.
- Audit prompt requires the agent to produce a compact checklist with states: `verified`, `missing`, `weak`, `blocked`, `not_applicable`.
- Audit prompt requires checking active goal state first and respecting stale goal id/status.
- Audit prompt forbids `update_goal(status:"complete")`, `create_goal`, queue starts, or normal continuation unless explicitly requested after the audit.
- Audit consumes available proof/subgoal/floor/budget/telemetry summaries when they exist.
- Persist bounded audit metadata as a separate custom entry, not long prose in `GoalState`.

## Rejected/deferred

- `/goal audit --churn`: defer; churn monitor remains separate.
- `/goal audit --completion` variants: defer until base audit lands.
- Automatic proof execution from audit: defer to ISSUE-021 proof tools; audit may report stale/missing proof status but should not own proof execution.
- Full widget rendering of audit history: defer; use tool output/transcript first.

## Execution-ready status

Execution-ready: yes. The major product/runtime forks are locked, and implementation can proceed without choosing command semantics, persistence posture, or auto-completion behavior.
