# ISSUE-024 — Refine `/goal audit` pre-completion review command

Status: refine — needs design decision before execution
Priority: P2
Owner: unassigned
Created: 2026-05-08
Next best session: design refinement pass for goal audit command UX
Next best session rationale: The feature is a distinct command/tool surface that overlaps completion proofs and churn checks but needs its own UX, prompt, and state semantics before implementation.
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on:
- `.ai/issues/refine/ISSUE-021-goal-completion-proofs.md`
- `.ai/issues/refine/ISSUE-020-goal-churn-monitor.md`

Goal: Design a `/goal audit` command that asks the agent to run the completion-audit protocol without marking the goal complete or continuing indefinitely.

## Problem

The continuation prompt already instructs the agent to perform a completion audit before calling `update_goal(status: "complete")`, but there is no explicit user command for "audit where we are". Users may want a bounded review of current goal state, completed work, missing requirements, proofs, and next steps without triggering normal continuation or completion.

This is related to, but distinct from, durable proof gates:

- proof gates answer whether specific commands/conditions passed;
- `/goal audit` asks for a qualitative requirement-by-requirement review against the objective and current artifacts;
- churn monitor asks whether the agent is stuck or following a bad strategy.

## Desired behavior sketch

- User runs `/goal audit` while a goal exists.
- The runtime sends a hidden or visible audit steering prompt asking the model to:
  - restate objective requirements as a checklist;
  - map each requirement to evidence;
  - inspect relevant files/outputs/state;
  - identify missing, weakly verified, or blocked items;
  - recommend continue, pause/escalate, or ready-to-complete.
- The audit does **not** call `update_goal(status: "complete")` automatically.
- If completion proofs exist, audit includes their latest pass/fail/staleness state.
- Audit output may optionally be persisted as a checkpoint or audit record.

## Open design questions

1. Should `/goal audit` trigger an agent turn, produce a deterministic local summary, or both?
2. Should audit be visible transcript content, hidden steering plus visible response, or a custom message type with special rendering?
3. Should audit be allowed while the goal is paused or budget-limited?
4. Should audit reset/affect no-progress and auto-continuation telemetry?
5. Should audit records persist in goal state, a separate custom entry type, or only the transcript?
6. How does audit relate to durable proof gates and subgoal completion state?
7. Should there be variants such as `/goal audit --completion`, `/goal audit --churn`, or keep audit narrowly completion-oriented?

## Candidate acceptance criteria after refinement

- `/goal audit` works when a goal exists and gives a bounded completion-readiness review.
- Audit cannot mark the goal complete by itself.
- Audit does not schedule normal continuation unless the user explicitly asks to continue afterward.
- Audit output distinguishes verified, missing, weakly verified, and blocked requirements.
- If proof gates exist, audit incorporates their status without treating them as the whole audit.
- Audit behavior is stale-guarded by goal id/status and does not bypass paused/budget-limited controls.
- UI/transcript output is concise enough for repeated use.

## Non-goals for first refinement

- Full proof-gate execution engine; see ISSUE-021.
- Full churn classifier; see ISSUE-020.
- Automatic completion after audit.
- Replacing the normal continuation prompt's built-in completion-audit instructions.

## Refinement todos

- [ ] Decide command semantics and whether it triggers an agent turn.
- [ ] Define audit prompt and output structure.
- [ ] Decide persistence/checkpoint behavior for audit records.
- [ ] Define interactions with paused, budget-limited, proof-gated, and subgoal-enabled goals.
- [ ] Decide whether audit has variants or remains one focused pre-completion command.
