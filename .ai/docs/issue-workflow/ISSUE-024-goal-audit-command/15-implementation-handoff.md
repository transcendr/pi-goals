# 15 — Implementation handoff

## Recommended first patch order

0. Preserve entrypoint wiring simplicity:
   - `.pi/extensions/goal/index.ts` currently wires command/tools to continuation, monitor, budget wrap-up, queue steering, and lifecycle with direct scheduler dependencies.
   - Audit should avoid adding another broad scheduler dependency to `index.ts` if possible; prefer a small shared audit sender/helper passed only where needed, and keep no-continuation behavior explicit.
1. Add constants/types:
   - `GOAL_AUDIT_MESSAGE_TYPE`
   - `GOAL_AUDIT_PROMPT_ID`
   - audit steering kind/details
   - bounded audit metadata type if persisted
2. Add audit prompt builder:
   - distinct from continuation prompt;
   - includes stale guard and read-only status behavior;
   - requires evidence-state checklist.
3. Add slash command surface:
   - `GoalSubcommand` includes `audit`;
   - handler sends audit prompt and does not schedule continuation.
4. Add model tool surface:
   - `audit_goal` calls same prompt/send helper;
   - returns audit-specific structured details.
5. Add lifecycle filtering for audit message type:
   - valid for matching goal id;
   - status-aware for active/paused/budgetLimited/complete;
   - invalid after clear/replacement.
6. Add bounded metadata persistence only if first pass stores records.
7. Add deterministic probes and README docs.
8. Run `npm run quality:goal` and live probe or skip rationale.

## High-risk implementation seams

- Do not call `scheduleContinuation(ctx, "resumed" | "created" | "agentEnd")` from audit.
- Do not call `update_goal(status:"complete")` or any completion decision path from audit.
- Do not reuse `GOAL_MONITOR_MESSAGE_TYPE`; audit is not monitor steering.
- Do not store long model audit prose on `GoalState`.
- Do not reject paused/budget-limited/complete goals; audit them read-only.
- Do not call `resetSafetyCounters()` or `noteContinuationScheduled()` from audit. `.pi/extensions/goal/telemetry.ts` shows these are resume/continuation semantics; audit should preserve telemetry except optional bounded audit metadata.

## Suggested prompt shape

The audit prompt should ask the worker to output:

1. goal id/status checked;
2. objective requirements checklist;
3. evidence mapping per requirement;
4. proof/subgoal/floor/budget state summary when present;
5. missing/weak/blocked items;
6. recommendation: `continue`, `pause_or_escalate`, or `ready_to_complete_by_user_choice`.

It must explicitly say: do not mark the goal complete during audit.
