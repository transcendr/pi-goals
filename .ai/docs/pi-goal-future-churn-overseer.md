# Future pi-goal churn overseer concept

Date: 2026-05-08
Status: future idea; not first-landing scope
Related issue: `.ai/issues/open/ISSUE-001-pi-goal-extension.md`

## Purpose

Preserve the design conversation about a future `pi-goal` overseer / churn-controller feature so later sessions do not need access to the chat transcript.

The first `pi-goal` landing should stay focused on Codex-style `/goal` parity. This document captures a later extension layer that could monitor a goal-running agent from a sparse third-person perspective and steer it out of unproductive loops.

## User-provided motivating example

A Codex CLI `/goal` session was asked to refactor code and validate the work with an automated headless browser tool.

The actual browser validation needed was simple:

1. Load a page.
2. Click a button.
3. Observe whether the expected behavior occurred.

Instead, the agent discovered an old, irrelevant end-to-end helper script that used the same browser tool for a different use case. That helper included unrelated waits, selectors, auth setup, and assumptions. The goal agent fixated on adapting that helper and churned for hours trying to make it work, rather than stepping back and trying the smallest direct validation path.

The desired future feature is a third-person monitor that can detect this kind of goal churn and nudge the working agent to back up, discard a bad path, and retry from the simplest/smallest plausible unblocker.

## Feasibility assessment from planning discussion

The future overseer is feasible if the first `pi-goal` landing keeps clean runtime seams. Estimated complexity by stage:

- Same-session heuristic telemetry and safety signals: low to moderate complexity.
- Same-session LLM churn check or `/goal audit` style review: moderate complexity.
- Separate Pi overseer session that sparsely monitors and steers another Pi goal session: moderate to high complexity because it needs safe cross-session coordination, stale-steer filtering, ownership rules, and feedback-loop prevention.

The current `pi-goal` plan supports this direction if it preserves event-sourced state, typed runtime steering messages, context filtering, turn lifecycle hooks, safety counters, and compact telemetry. The first landing should not implement the overseer, but it should avoid hiding all useful runtime signals in ephemeral local variables.

## Proposed future feature

A future `pi-goal` layer could run a sparse, token-efficient overseer agent, potentially backed by another Pi session, whose role is not to solve the goal directly. Its role is to monitor goal pursuit for churn patterns and provide narrow corrective steering.

The monitor should answer questions like:

- Is the goal agent repeating the same failing strategy?
- Is it fixated on an assumption that has not been validated?
- Is it increasing complexity instead of trying the smallest unblocker?
- Is it treating incidental discovered code as mandatory when the goal does not require it?
- Is there a simpler direct test, reproduction, or validation path?
- Should the active goal be allowed to continue, steered, paused, or escalated to the user?

## Important correction from the design discussion

The churn taxonomy must stay generic. It must not hard-code project-specific or task-specific labels from one anecdote.

For example, a classifier label tied directly to browser selectors or auth detours would be too specific. The browser/auth/selectors story is only one instance of a broader pattern. The generic pattern is something like:

- `irrelevant_artifact_fixation`
- `strategy_fixation`
- `unsupported_assumption_loop`
- `complexity_escalation`
- `evidence_blind_retry`

Task-specific details can appear in evidence text, not in the stable classifier taxonomy.

## Prior implementation vision, corrected

The future system could be layered in stages:

### Stage 1 — Heuristic telemetry inside first-party `pi-goal`

This is the lightest future-compatible foundation and is now planned for the first landing as telemetry only.

The runtime records compact counters and event summaries such as:

- automatic continuation count
- consecutive no-progress count
- tool call/result counts per turn
- whether a turn was automatic or user-initiated
- whether the model completed the goal through `update_goal`
- whether a budget limit, abort, safety pause, or continuation happened
- compact last-action/last-steer metadata

This does not implement the overseer. It only gives future monitors enough signal to avoid rereading the entire transcript.

### Stage 2 — Same-session churn check

A later version could add a manual or periodic `/goal churn-check` / `/goal audit` command that summarizes recent telemetry and asks a compact judge prompt whether the goal appears stuck.

Possible output shape:

```json
{
  "churn": true,
  "confidence": "high",
  "pattern": "irrelevant_artifact_fixation",
  "evidence": [
    "The agent repeatedly attempted to adapt an artifact not required by the objective.",
    "Recent failures did not validate or invalidate the simplest path."
  ],
  "minimal_steer": "Stop adapting the incidental helper. Restate the minimum validation required and try the smallest direct approach first.",
  "recommended_action": "steer"
}
```

### Stage 3 — Separate Pi overseer session

The richer version could run an overseer in a separate Pi session or extension module. That monitor would consume compact goal telemetry plus selected transcript excerpts, then emit advisory steering events back to the goal session.

This is more complex because it needs safe cross-session coordination, ownership rules, sparse polling, stale-steer filtering, and a way to prevent monitor/worker feedback loops.

## Generic churn semantics

Stable classifier labels should describe reusable failure modes, not domains:

- `strategy_fixation`: repeatedly tries the same approach after low-signal or negative evidence.
- `irrelevant_artifact_fixation`: treats an incidental discovered artifact as required despite weak relevance.
- `unsupported_assumption_loop`: keeps acting on an assumption that has not been checked directly.
- `complexity_escalation`: adds setup, abstraction, dependencies, or indirection before trying the smallest direct unblocker.
- `evidence_blind_retry`: retries without incorporating the latest error or observation.
- `validation_tunnel_vision`: focuses on making a validation harness work while losing sight of the behavior being validated.
- `scope_drift`: optimizes or debugs outside the stated objective without a clear dependency.
- `thrash`: jumps among approaches without preserving useful state or a falsifiable next step.
- `user_escalation_needed`: progress is blocked by missing credentials, ambiguous requirements, unavailable service, or a decision the agent should not make alone.

Task-specific details belong in `evidence[]` and `minimal_steer`, not in classifier names.

## Why the current `pi-goal` plan can support this later

The first-landing plan has useful seams:

- branch-local event-sourced state via `pi-goal-state`
- hidden, typed runtime steering messages
- context filtering for stale steering messages
- turn lifecycle hooks
- safety counters
- UI status/widget surfaces
- command/tool separation

The main addition needed now is compact telemetry that future overseers can consume. The first landing should not implement the monitor, but it should avoid hiding all runtime signals in ephemeral local variables.

## Future non-goals for first landing

Do not include these in the initial parity implementation:

- separate overseer Pi session
- autonomous churn judge prompt
- cross-session steering transport
- task-specific churn classifiers
- domain-specific browser/test/auth patterns
- broad transcript summarization for monitor input

## First-landing telemetry implication

The issue doc should require `pi-goal` to maintain compact telemetry as part of state events and in-memory turn summaries. This telemetry should be useful for:

- current runaway safety caps
- future churn monitor input
- future timeline/audit UI
- debugging auto-continuation behavior

It should not change Codex parity behavior, add new statuses, or make the first landing dependent on an overseer.
