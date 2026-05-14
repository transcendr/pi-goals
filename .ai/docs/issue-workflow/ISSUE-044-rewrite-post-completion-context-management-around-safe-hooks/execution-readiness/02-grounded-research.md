# 02 — Grounded research

## Commands and files inspected

Command transcript is in [`raw/commands.log`](raw/commands.log), including:

- `rg` over `.pi/extensions/goal` for context reset state, parsing, tool schemas, and queue handoff paths.
- `find .ai/validation -name 'goal-context-reset-*.mjs'`.
- `sentrux gate .pi/extensions/goal` and `sentrux check .pi/extensions/goal`.
- feature-flag/config surface search.
- compaction queue-handoff/reset-gate search.

Read directly:

```toon
toon.version: 1
files_read[14]{path,reason}:
  ".pi/extensions/goal/context-reset.ts","current parser, command-context capture, anchor, reset attempt, failed/done state"
  ".pi/extensions/goal/command.ts","slash /goal and /goal queue ingress paths"
  ".pi/extensions/goal/tools.ts","model-tool create/update/template schemas and completion queue handoff"
  ".pi/extensions/goal/queue-tools.ts","tool enqueue/start/dequeue queue paths"
  ".pi/extensions/goal/lifecycle.ts","turn_end and agent_end reset/handoff ordering"
  ".pi/extensions/goal/continuation.ts","compaction continuation queue handoff paths"
  ".pi/extensions/goal/templates.ts","template invocation parse/expansion ordering"
  ".pi/extensions/goal/types.ts","GoalState context reset fields"
  ".pi/extensions/goal/state.ts","state replay/persistence parsing"
  ".pi/extensions/goal/queue-state.ts","queued goal fields and replay parsing"
  ".pi/extensions/goal/queue-steering.ts","queue handoff prompt/ticket surface"
  ".pi/extensions/goal/ui.ts","context reset failure user warning"
  "README.md","documented post-completion context reset surface"
  ".ai/issues/open/ISSUE-043-per-goal-post-completion-context-reset.md","original issue intent and proofs"
```

Validation probes inspected:

```toon
probes[5]{path,research_fact}:
  ".ai/validation/goal-context-reset-failure-probe.mjs","currently asserts failure blocks queue handoff"
  ".ai/validation/goal-context-reset-clear-handoff-probe.mjs","asserts reset precedes handoff in lifecycle/tool paths"
  ".ai/validation/goal-context-reset-summarize-handoff-probe.mjs","asserts summarize navigation and bounded instructions"
  ".ai/validation/goal-context-reset-nl-policy-probe.mjs","asserts trailing directive parser and stripping"
  ".ai/validation/goal-context-reset-model-tool-policy-probe.mjs","asserts model-tool prose parsing plus /goal anchor capability errors"
```

## Current architecture facts

```toon
current_facts[12]{id,surface,fact,evidence}:
  "cf1","goal state","context reset is stored as single-purpose fields on GoalState","types.ts lines 12-17; state.ts lines 54-57,164-174"
  "cf2","queue state","queued goals store objective plus optional template metadata plus postCompletionContext","queue-state.ts lines 13,68-77,202-217"
  "cf3","parser","directive parser accepts only a trailing final-objective phrase","context-reset.ts line 17 and lines 49-60"
  "cf4","template path","template resolution interpolates args before the caller parses the final objective","templates.ts resolveGoalTemplateByName plus command.ts lines 342-352"
  "cf5","tool schema","create_goal/create_goal_from_template/enqueue_goal schemas expose budgets/floors but no structured post-completion action param","tools.ts CreateGoalParams/CreateGoalFromTemplateParams; queue-tools.ts CreateGoalParams"
  "cf6","tools parsing","tool paths parse directives out of objective prose after template resolution","tools.ts lines 221,239-250; queue-tools.ts lines 75-83,160-174"
  "cf7","lifecycle reset gate","turn_end and agent_end attempt reset before normal handoff and return on failure","lifecycle.ts lines 102-115 and 287-294"
  "cf8","failure UI","failure warning explicitly says queued handoff was blocked","ui.ts lines 37-43"
  "cf9","failed state behavior","needsPostCompletionContextReset returns true for failed reset because only done is terminal","context-reset.ts line 101"
  "cf10","queue dequeue handoff","dequeue handoff suppresses when needsPostCompletionContextReset is true","queue-tools.ts lines 195-201"
  "cf11","compaction handoff","compaction continuation prequeue/fallback can send queue handoff for a complete goal without consulting reset pending state","continuation.ts lines 221-246 and 276-286"
  "cf12","feature flags","no current post-completion action/context-reset feature flag or hook kill switch exists","rg feature flag/config search found no relevant flag surface"
```

## Current implementation strengths to preserve

```toon
strengths[6]{id,strength,why_preserve}:
  "s1","post-start anchor recording","queued goal anchors are intended to be recorded after dequeue, preventing queue resurrection"
  "s2","same-session navigation","uses Pi tree navigation instead of new sessions or compaction-as-substitute"
  "s3","replay repair after navigation","attempts to replay goal/queue state after branch navigation and append repaired state"
  "s4","actionable failure messages","users are told when reset cannot run and why"
  "s5","bounded summarize instructions","summary mode has goal-specific bounded instructions"
  "s6","deterministic probes exist","nine context-reset probes provide useful regression anchors, even though several must be inverted/expanded for the rewrite"
```

## Current implementation gaps / anti-pattern evidence

```toon
gaps[9]{id,pattern,evidence,impact}:
  "g1","cross-ingress parsing drift","command.ts, tools.ts, and queue-tools.ts each call directive parsing in their own path","template args can be interpreted differently depending on slash/tool/queue route"
  "g2","template expansion before goal-level directive extraction","templates.ts interpolates {{args}} into an arbitrary body before command/tool callers parse directives","/goal repo-worktree-inventory -- current state and summarize context can lose policy if args are embedded mid-template"
  "g3","prose-only tool control","tool schemas lack structured post-completion action parameters","agents must smuggle behavior through objective text and can misclassify it as template args"
  "g4","single-purpose state shape","postCompletionContext/contextResetStatus fields model one feature instead of lifecycle actions","future hooks would require more one-off fields and lifecycle branches"
  "g5","optional side effect gates core continuation","reset failure returns before queue handoff in lifecycle","a reset adapter bug can strand queued goal processing"
  "g6","failed reset remains pending/interfering","needsPostCompletionContextReset treats any non-done status as needing reset","failed status can keep suppressing handoff/recovery paths"
  "g7","special-case lifecycle branching","reset concerns are imported directly into lifecycle/tools/queue-tools","core goal/queue state machine knows too much about reset implementation details"
  "g8","compaction continuation bypass risk","continuation.ts queue handoff recovery does not consult reset pending state","the implementation has contradictory handoff policies across auto-continuation paths"
  "g9","string-inclusion probes are shallow for architecture boundary","several probes assert source snippets rather than running behavior through a normalized API","they can pass while new ingress combinations remain broken"
```

## Sentrux snapshot

```toon
sentrux[2]{command,quality,coupling,result}:
  "sentrux gate .pi/extensions/goal",6223,0.14,"pass; cycles 0; god files 0; no degradation"
  "sentrux check .pi/extensions/goal",6223,0.14,"pass; 33 rules checked"
```

The current module graph is structurally healthy by Sentrux. The problem is not broad coupling/cycles; it is boundary placement: optional context-reset behavior is entangled with core continuation decisions and ingress parsing is duplicated across paths.

## Research conclusion

The rewrite should not start by editing the existing reset branches in place. It should introduce a canonical intent/action boundary and a small process-manager/orchestrator around terminal goal handling:

1. Normalize all goal-creation ingress into a `GoalIntent` before template expansion mutates freeform args.
2. Store post-completion behavior as action specs/results, not as one-off context fields.
3. Decide/mint continuation as an explicit command/ticket independent of optional action execution.
4. Run context reset through a flagged adapter behind a port/bulkhead.
5. Treat post-completion action failure as visible telemetry/UI, never as a reason to skip expected queue continuation.
