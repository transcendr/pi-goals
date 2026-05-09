# ISSUE-020 — Refine churn monitor / overseer for long-running goals

Status: open — execution-ready
Priority: P1
Owner: unassigned
Created: 2026-05-08
Next best session: focused implementation/validation pass for third-party churn monitor agent
Next best session rationale: Design is locked to a persistent headless Pi judge session that receives sparse goal reports and may inject stale-guarded steering only after identifiable churn.
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


## User decision / design lock

The implementation must **not** be a watered-down deterministic telemetry parser. It must use a project/goal/process-agnostic third-party judge agent.

Locked behavior:

- Add a manual `/goal churn-check` command and an internal runtime helper that can invoke a persistent monitor agent for the current goal.
- The monitor runs as a headless Pi session using `pi --session-dir <runtime-dir> --session <goal-scoped-id> -p <prompt>` so it has persistent context per goal across invocations.
- Each invocation sends sparse current goal state, compact telemetry, and a small recent-session report. It does not send the full transcript by default.
- The prompt requires real, identifiable churn before recommending correction. It must be patient, avoid impatience, and avoid steering merely because a goal is long-running.
- The monitor keeps a goal-scoped churn log with timestamps in local runtime storage. The prompt receives recent log entries so it can reason about time between checks and avoid over-zealous repeated steering.
- Monitor output is structured JSON embedded in text with: `churn`, `confidence`, `pattern`, `evidence`, `steer`, `recommended_action`, and `cooldown_seconds`.
- Only `recommended_action: "steer"`, `churn: true`, and medium/high confidence may inject steering.
- Steering uses Pi-native `pi.sendMessage(..., { deliverAs: "steer" })`, matching the existing budget warning/wrap-up steering mechanism.
- Steering messages use a dedicated custom type and are context-filtered/stale-guarded by goal id/status.
- The monitor cannot mark goals complete, mutate goal state directly, or bypass pause/budget/clear semantics.
- If the monitor process fails, the user gets a warning but normal goal runtime continues.

## Implementation checklist

- [ ] Add churn monitor constants/types and prompt builder.
- [ ] Add a churn monitor module that builds sparse reports, invokes persistent headless Pi, parses structured output, and appends a churn log.
- [ ] Add `/goal churn-check` command and autocomplete entry.
- [ ] Add stale-guarded churn steering custom messages to context filtering.
- [ ] Optionally invoke the monitor from lifecycle when no-progress/auto-turn telemetry indicates possible churn, but only with cooldown and confidence gating.
- [ ] Add focused probes for prompt/report shape, JSON parsing, log cooldown behavior, and steering gating.
- [ ] Run Sentrux gate/check, Pi load validation, and TypeScript attempt.

## Required proofs

required_proofs[5]{name,command,condition}:
  churn_probe,"NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-churn-probe.cjs",exit 0
  sentrux_gate,"sentrux gate .pi/extensions/goal",exit 0
  sentrux_check,"sentrux check .pi/extensions/goal",exit 0
  pi_load,"pi --offline --no-session --no-tools -e .pi/extensions/goal/index.ts --list-models",exit 0
  tsc_attempt,"tsc --noEmit --target ES2022 --module ESNext --moduleResolution node --strict --skipLibCheck .pi/extensions/goal/*.ts",record result
