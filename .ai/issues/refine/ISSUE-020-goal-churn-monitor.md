# ISSUE-020 — Refine churn monitor / overseer for long-running goals

Status: refine — needs design decision before execution
Priority: P1
Owner: unassigned
Created: 2026-05-08
Next best session: design refinement pass for churn monitor stage selection
Next best session rationale: The existing concept needs a concrete stage, input limits, output schema, and steering policy.
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on: `.ai/docs/pi-goal-future-churn-overseer.md`
Related: `.ai/issues/refine/ISSUE-024-goal-audit-command.md`

Goal: Turn the existing churn-overseer concept into an implementable design for detecting unproductive goal loops and nudging the working agent toward simpler, evidence-driven next steps.

## Problem

Long-running agents can churn: repeat failing strategies, fixate on irrelevant artifacts, increase complexity, or retry without incorporating evidence. The existing telemetry seam is intended to support a future monitor, but the actual monitor UX, judge prompt, safety rules, and steering transport are not designed yet.

## Desired behavior sketch

- A churn check can run manually (`/goal churn-check`) or periodically after suspicious telemetry patterns.
- The monitor reads compact telemetry and selected recent context, not the entire transcript by default.
- It classifies generic patterns such as `strategy_fixation`, `irrelevant_artifact_fixation`, `unsupported_assumption_loop`, or `complexity_escalation`.
- It can produce a minimal steer, recommend pause/escalation, or simply report no churn.
- Stable classifier labels remain generic; task-specific evidence appears only in evidence text.

## Open design questions

1. Manual command first, periodic same-session check, or separate overseer session?
2. What transcript excerpts are enough and safe to send to the monitor?
3. What confidence threshold permits automatic steering vs advisory notice?
4. How does churn steering avoid fighting the working agent or creating loops?
5. Should churn monitor consume future subgoal/progress/proof data?

## Candidate acceptance criteria after refinement

- Churn taxonomy stays generic and bounded.
- Monitor output is structured, compact, and actionable.
- Automatic steering, if allowed, is opt-in and stale-guarded by goal id/status.
- User-visible output explains why a steer or pause was recommended.
- Existing telemetry remains sufficient or the issue specifies exactly what new telemetry is needed.
- The monitor cannot mark goals complete or bypass user decisions.

## Non-goals for first refinement

- Domain-specific browser/test/auth classifiers.
- Full separate-session overseer before same-session command design is validated.
- Broad transcript summarization without token caps.

## Refinement todos

- [ ] Re-read `.ai/docs/pi-goal-future-churn-overseer.md` and current telemetry shape.
- [ ] Decide stage: manual check, periodic check, or separate overseer.
- [ ] Define classifier taxonomy and structured output schema.
- [ ] Define steering/pause/user-escalation rules.
- [ ] Define telemetry/context input limits and proof strategy.
