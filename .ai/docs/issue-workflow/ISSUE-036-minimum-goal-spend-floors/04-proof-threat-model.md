# 04 — Proof threat model

## Primary invariant

A configured minimum token/time spend floor is a real pre-wrap-up gate: while any configured floor is unmet, the goal cannot be marked complete through normal agent/tool completion, and the agent is steered toward materially valuable additional work rather than quota-filling churn.

## Secondary invariants

- Existing maximum budgets remain safety limits; minimum floors never force work past a maximum budget target or hard stop.
- Floors are persisted/replayed through goal and queue state without breaking old sessions that lack the optional fields; malformed optional floor fields in replay are ignored/sanitized rather than crashing.
- All configured floors must be satisfied before completion is accepted.
- Prompt, tool deferral, UI, and monitor surfaces distinguish floors from max budgets/caps.
- Existing no-progress/safety pause behavior remains effective even when a floor is unmet.

## Likely false-green outcomes

1. **Schema-only false green**
   - New fields exist in `GoalState`/tool schemas, but `update_goal(status:"complete")` still succeeds before floors are met.
2. **Prompt-only false green**
   - Continuation prompt mentions floors, but there is no hard gate at completion time.
3. **Numeric churn false green**
   - Completion is blocked, but the agent responds with filler, repeated summaries, or busywork just to satisfy the floor.
4. **Max-budget regression**
   - A min floor causes the agent to continue after token/time maximum budgets are exhausted, or budget-limited wrap-up prompts ask for floor-value work.
5. **User-question false green**
   - The agent asks the user what to do next whenever floors are unmet, even though the objective did not explicitly allow user decisions.
6. **Queue/template loss**
   - Floors survive direct create but are lost through `create_goal_from_template`, `enqueue_goal`, or `start_queued_goal`.
7. **Replay/display drift**
   - Branch replay accepts old goals but drops new floor fields, or UI/tool summaries label floors like caps.
8. **Monitor blind spot**
   - The churn monitor sees extra floor-driven turns as ordinary work and fails to steer low-value quota filling.
9. **Monitor vagueness false green**
   - The monitor notices floor churn but only says “keep going” instead of naming one concrete next value pass and action.
10. **Live/runtime mismatch**
   - Deterministic helper checks pass, but the real Pi loop lets a simple early-stop goal complete, asks the user for floor-unmet direction, or fails to inject useful autonomous continuation behavior.
11. **Soft wrap-up bypass**
   - The agent gives a final-answer-style “done” response without calling `update_goal(status:"complete")`; `agentEnd` continuation suppression swallows the floor steering even though floors remain unmet.
12. **No-value escape bypass**
   - `no_more_valuable_work_reason` is accepted as first-attempt model permission instead of a monitor/telemetry-backed recorded outcome such as `floorQualityState: "exhausted"`.
13. **No-value trap false green**
   - The gate blocks completion forever after useful autonomous work is exhausted, causing manufactured work instead of allowing completion with `noMoreValuableWorkReason: "no_safe_autonomous_work"` and `floorQualityState: "exhausted"`.
14. **Same-call floor removal bypass**
   - A single `update_goal` call removes/lowers an unmet floor and sets `status:"complete"`, bypassing current persisted floor gating.
15. **Wrong insertion-order false green**
   - Completion deferral runs after `cancelContinuation`, `cancelMonitor`, state persistence, or queue-complete steering, leaving an active floor-unmet goal with broken runtime machinery.
16. **Stale monitor poisoning**
   - A stale monitor response with `floor_quality_exhausted` mutates telemetry after the goal is no longer current, active, or floor-blocked.
17. **Replay hard-crash**
   - Strict parsing rejects old or malformed optional floor fields during replay instead of treating them defensively as absent.

## Deterministic proof strategy

Required deterministic coverage should include:

- floor evaluation helper cases:
  - no floors configured,
  - token floor unmet/met,
  - time floor unmet/met,
  - both floors where one remains unmet,
  - impossible min > max rejected;
- tool create/update schema validation:
  - create with floors,
  - create-from-template with floors,
  - update floors to new values,
  - remove floors with `null`,
  - reject invalid values,
  - reject same-resource min floor greater than max budget at create/update/enqueue,
  - block same-call floor removal/lowering plus `status:"complete"` while current persisted floors are unmet;
- completion gate:
  - `update_goal(status:"complete")` is deferred when token floor unmet,
  - deferred when time floor unmet,
  - deferred when either of two configured floors remains unmet,
  - accepted once all configured floors are met,
  - fake first-attempt `no_more_valuable_work_reason` does not bypass floors,
  - wrong insertion-order side effects are absent (`cancelContinuation`, `cancelMonitor`, completion persistence, queue-complete steering),
  - monitor/telemetry-backed `floorQualityState: "exhausted"` allows completion with recorded `noMoreValuableWorkReason`;
- queue persistence:
  - enqueue with floors,
  - queued persisted metadata preserves floors,
  - queue display shows floors,
  - start queued goal preserves floors,
  - template-created goals preserve floors;
- prompt/deferral text:
  - shared floor-steering catalog exists with stable pass ids,
  - continuation prompt requires one `next_floor_pass`, concrete tool-backed action where possible, and evidence/artifact deltas,
  - early-completion deferral includes unmet floor deltas, `completion_blocked_by_floor: true`, a catalog-backed next-pass instruction, and anti-churn instruction,
  - floor-unmet guidance includes the autonomous fallback ladder and forbids asking the user unless objective text explicitly allows user decisions;
- monitor/UI/report:
  - monitor report includes floor fields/remaining deltas,
  - monitor prompt classifies productive floor deepening vs quota-filling churn,
  - monitor steering names one next value pass and one concrete next action,
  - monitor `escalate` is disallowed for floor-unmet uncertainty unless objective text explicitly allows user input or a separate safety/authorization boundary requires it,
  - monitor can emit `floor_quality_exhausted` after repeated no-evidence floor work,
  - stale monitor floor patterns do not mutate telemetry unless the current active goal id matches and `completionBlockedByFloor` is true,
  - UI/tool output differentiates floors from maximum budgets;
- soft final-answer wrap-up:
  - final-answer-style `agentEnd` while floors are unmet triggers floor-aware continuation,
  - continuation suppression does not swallow the steering unless floor quality is exhausted, budget is exhausted, or a safety cap is reached;
- replay/API shape:
  - missing floor fields replay as no floor,
  - malformed optional floor fields in replay are ignored/sanitized without crashing,
  - `createGoalState` uses a named options object so max-budget and min-floor arguments cannot be swapped silently.

## Live probe strategy

A live probe is mandatory for the implementation because the most important behavior is live agent steering quality, not just helper math.

Probe design:

1. Resolve the existing `pi-goals-live-probe` process by name from Solo context; spawn only if absent.
2. Reload the extension after implementation.
3. Clear any disposable existing test goal only when safe/authorized by the probe context.
4. Create a simple goal with a minimum floor high enough that a first short completion attempt should be too early. Prefer a time floor for deterministic early-unmet state, e.g. a 30-60 second floor, or a token floor high enough that a one-line completion attempt is below it.
5. Prompt the agent with a simple task that would normally finish immediately.
6. Observe that early `update_goal(status:"complete")` is deferred or not attempted, and the agent instead selects a named `next_floor_pass` from the catalog.
7. Inspect transcript/output for concrete autonomous additional work, not just repeated statements, and verify the agent does not ask the user for floor-unmet direction.
8. If possible, let the monitor run long enough to see either `watch` for productive floor deepening or `steer` for a deliberately induced early-wrap-up/filler attempt.
9. Clean up by lowering/removing the floor or clearing the disposable test goal.

Good live evidence:

- command/input used to create the minimum-floor goal;
- `get_goal`/tool output showing floors configured and unmet;
- transcript snippet showing early completion blocked or avoided;
- transcript snippet showing the named `next_floor_pass` and qualitative continuation strategy applied;
- transcript snippet or monitor log showing no user-question fallback for ordinary floor-unmet uncertainty;
- final cleanup state.

## Required proofs TOON draft

```toon
toon.version: 1
required_proofs[7]{name,source,command,pass_condition,scope,notes}:
  "sentrux_baseline","issue doc","sentrux gate --save .pi/extensions/goal","exit 0",run,"pre-implementation architecture sensor per repo rule"
  "floor_gate_probe","issue doc","node .ai/validation/goal-min-spend-floors-probe.mjs","exit 0 and probe output shows create/update/enqueue validation, floor helper cases, completion deferral before floors, completion acceptance after floors or monitor-backed floor-quality exhaustion, fake no-more-work bypass rejection, same-call floor removal plus complete blocked, wrong-insertion-order side effects absent, and max-budget precedence",run,"implementation should add this focused deterministic probe or amend this proof path with reason"
  "floor_steering_probe","issue doc","node .ai/validation/goal-floor-steering-probe.mjs","exit 0 and probe output shows shared value-pass catalog rows, prompt/refusal text require a next_floor_pass, concrete evidence deltas, autonomous fallback, no-user rule, objectiveAllowsUserFloorFallback, monitor watch/steer/escalate/floor_quality_exhausted cases, and stale floor-pattern guard",run,"proves the owner-highlighted steering design is implemented concretely not as vague prose"
  "prompt_surface_probe","issue doc","rg -n \"floor-steering|FLOOR_VALUE_PASS_CATALOG|next_floor_pass|quota_filling_churn|floor_ignored_early_wrapup|productive_floor_deepening|floor_quality_exhausted|objectiveAllowsUserFloorFallback|noMoreValuableWorkReason|completion_blocked_by_floor|min_tokens_before_wrap_up|min_time_seconds_before_wrap_up\" .pi/extensions/goal README.md","exit 0 with matches in shared steering module, prompts, monitor report/prompt, tool schemas, UI/format, and README",run,"static smoke check that floor semantics and monitor steering are not helper-only"
  "quality_goal","issue doc","npm run quality:goal","exit 0",run,"required project gate after implementation"
  "live_probe_min_floor","issue doc","Follow .ai/docs/pi-goals-live-probe-testing.md: resolve pi-goals-live-probe from current Solo context, reload, create a disposable goal with min_time_seconds_before_wrap_up or min_tokens_before_wrap_up, attempt an immediate simple completion, inspect output, then clean up","transcript shows the floor is unmet, completion is blocked or avoided, the agent performs a named concrete next_floor_pass with higher-quality additional work instead of filler, does not ask the user for floor-unmet direction, and cleanup leaves no disposable goal/queue residue",run,"mandatory behavior proof for live steering quality"
  "artifact_closeout","issue doc","test -f .ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/07-implementation-closeout.md && rg -n \"floor_gate_probe|floor_steering_probe|live_probe_min_floor|npm run quality:goal|pi-goals-live-probe\" .ai/docs/issue-workflow/ISSUE-036-minimum-goal-spend-floors/07-implementation-closeout.md","exit 0",run,"closeout records deterministic and live evidence"
```

## Proof adequacy conclusion

Deterministic tests alone are insufficient because the user explicitly cares about steering quality when an agent attempts to stop early. The implementation must combine deterministic gates with a bounded live probe that demonstrates the agent does valuable autonomous incremental work while floors remain unmet, without falling back to user questions unless the objective explicitly permits them.
