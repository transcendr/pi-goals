# 02 — Live surface research

## Commands run

Recorded in [`raw/commands.log`](raw/commands.log):

- `git status --short --untracked-files=all`
- issue existence check
- `wc -l` for main goal extension files
- `rg` for exported functions, TypeBox schemas, parser/reset/handoff hooks, and compaction handoff paths
- validation probe inventory
- feature flag/config search across `.pi/extensions/goal`, README, package, and Pi docs
- `sentrux gate .pi/extensions/goal`
- `sentrux check .pi/extensions/goal`

## Current implementation surface map

```toon
toon.version: 1
surfaces[15]{path,classification,current_role,implementation_role}:
  ".pi/extensions/goal/types.ts",edit,"GoalState/QueuedGoal-adjacent shared types include reset-specific fields","add canonical GoalIntent, PostCompletionActionSpec/State, ContinuationTicket, deprecate legacy reset fields"
  ".pi/extensions/goal/goal-intent.ts",create,"absent","new anti-corruption layer for slash/tool/template/queue input normalization"
  ".pi/extensions/goal/post-completion-actions.ts",create,"absent","new action state helpers and safe runner/process-manager boundary"
  ".pi/extensions/goal/continuation-ticket.ts",create,"absent","new pure ticket decision/revalidation/dispatch helpers"
  ".pi/extensions/goal/feature-flags.ts",create,"absent","new default-on env kill-switch parser and strategy selection helper"
  ".pi/extensions/goal/context-reset.ts",edit,"owns parser, context capture, anchor, needsReset, navigateTree reset","stop owning generic parser/gate; become context.reset adapter plus command-context/anchor helpers"
  ".pi/extensions/goal/command.ts",edit,"slash command, queue block, template handling, /goal anchor","delegate directive/action parsing to goal-intent; use action specs for create/enqueue/start"
  ".pi/extensions/goal/tools.ts",edit,"model tools, create_goal/create_goal_from_template/update_goal, tool completion handoff","add structured action params; async terminal workflow on completion/budget-limited handoff"
  ".pi/extensions/goal/queue-tools.ts",edit,"enqueue/start/dequeue queue tools and direct queued goal start","add structured action params; queued action persistence; continuation ticket on dequeue handoff"
  ".pi/extensions/goal/lifecycle.ts",edit,"turn_end/agent_end terminal reset gate and queue handoff","replace reset-gate branches with terminal workflow: decide ticket, run safe actions, dispatch"
  ".pi/extensions/goal/continuation.ts",edit,"active-goal continuation and compaction queue handoff recovery","reuse continuation ticket for compaction queue handoff/prequeue/fallback"
  ".pi/extensions/goal/state.ts",edit,"GoalState creation/replay/persistence parsing","parse postCompletionActions and synthesize from legacy ISSUE-043 fields"
  ".pi/extensions/goal/queue-state.ts",edit,"QueuedGoal creation/replay/persistence parsing","parse queued postCompletionActions and synthesize from legacy postCompletionContext"
  ".pi/extensions/goal/ui.ts",edit,"context reset failure warning says handoff blocked","change warning semantics to visible/nonblocking; add action failure/skipped notices"
  "README.md",edit,"documents prose-first reset and fail-closed handoff behavior","document structured tool params, template raw-directive semantics, default-on kill switches, nonblocking failure"
```

Validation/doc surfaces:

```toon
validation_surfaces[12]{path,classification,planned_role}:
  ".ai/validation/goal-intent-normalization-probe.mjs",create,"behavioral-ish probe for canonical ingress normalization"
  ".ai/validation/goal-template-raw-context-directive-probe.mjs",create,"reported template raw directive regression proof"
  ".ai/validation/goal-tool-post-completion-actions-schema-probe.mjs",create,"tool schema/action conflict proof"
  ".ai/validation/goal-continuation-ticket-probe.mjs",create,"pure continuation ticket decision/revalidation proof"
  ".ai/validation/goal-post-completion-action-failure-nonblocking-probe.mjs",create,"inverted failure semantics proof"
  ".ai/validation/goal-compaction-continuation-ticket-probe.mjs",create,"compaction prequeue/fallback ticket proof"
  ".ai/validation/goal-post-completion-feature-flag-probe.mjs",create,"default-on kill-switch/no-op runner proof"
  ".ai/validation/goal-post-completion-legacy-replay-probe.mjs",create,"legacy ISSUE-043 replay compatibility proof"
  ".ai/validation/goal-context-reset-failure-probe.mjs",edit,"old fail-closed assertion must be replaced or inverted"
  ".ai/validation/goal-context-reset-clear-handoff-probe.mjs",edit,"reset-before-handoff assumption must become action-attempt-before-dispatch with nonblocking failure"
  ".ai/validation/goal-context-reset-summarize-handoff-probe.mjs",edit,"keep successful summarize navigation assertions but not blocked-failure semantics"
  ".ai/docs/pi-goals-live-probe-testing.md",read-only,"live proof guide; no reusable scenario update required unless implementation creates one"
```

## Live code facts relevant to patch planning

```toon
facts[12]{id,fact,source}:
  "f1","main mutable files are already near size limits: lifecycle.ts 445 lines, tools.ts 441, command.ts 384, continuation.ts 384","wc -l command"
  "f2","context-reset.ts currently exports parsePostCompletionContextDirective, contextResetPolicyError, withPostCompletionContextPolicy, recordPostStartContextResetAnchor, markContextResetPendingOnCompletion, needsPostCompletionContextReset, attemptPostCompletionContextReset","rg export functions"
  "f3","command.ts parses directives after resolveTemplateOrObjectiveDetails, so template final objective position controls behavior","command.ts rg lines 342-352"
  "f4","tools.ts create_goal_from_template resolves template before createGoalWithPolicy parses final objective","tools.ts rg lines 221-250"
  "f5","queue-tools.ts startQueuedGoal re-resolves template objective then parses final objective and merges stored/parsed policy","queue-tools.ts rg lines 153-174"
  "f6","tools.ts and queue-tools.ts TypeBox params currently expose budgets/floors only, no post_completion action fields","rg Type.Object lines"
  "f7","lifecycle.ts returns on reset failure in both agent_end and turn_end before queue handoff","rg lines 102-115 and 287-294"
  "f8","queueTools.dequeue skips handoff when needsPostCompletionContextReset(goal) is true","queue-tools.ts rg line 196"
  "f9","continuation.ts compaction queue handoff paths call sendQueueHandoff directly and do not consult reset/action state","continuation.ts rg lines 221-286"
  "f10","feature flag/config search found only debug env vars PI_GOAL_COMPACTION_DEBUG*","rg feature flag/config command"
  "f11","Pi extension docs show settings.json resource loading but inspected ExtensionContext/ExtensionAPI types do not expose a simple per-extension settings getter","Pi docs/types read"
  "f12","Sentrux gate/check pass currently: quality 6223, coupling 0.14, cycles 0, god files 0","sentrux commands"
```

## Owner decision from implementation fork

Feature flag source/default was a real implementation/API fork. After research, the owner selected default-on env kill switches.

Locked contract for implementation:

```toon
flag_contract[4]{flag,default,disabled_values,effect}:
  "PI_GOAL_POST_COMPLETION_ACTIONS","enabled","0,false,no,off","select no-op/skipping post-completion action runner; continuation still dispatches"
  "PI_GOAL_CONTEXT_RESET","enabled","0,false,no,off","context.reset actions are marked skipped/disabled; other future actions can still run"
  "unset flags","enabled","n/a","preserve shipped ISSUE-043 behavior except failure becomes nonblocking"
  "truthy/unknown values","enabled","anything except disabled values","avoid surprising opt-out due to typos"
```

## Implementation implications

```toon
implications[7]{id,implication}:
  "i1","new modules are necessary to keep lifecycle/tools/command from growing further and to satisfy Sentrux/god-file pressure"
  "i2","goal-intent must operate before template expansion and must return cleaned invocation args plus action specs"
  "i3","postCompletionActions should be canonical, with legacy postCompletionContext fields parsed only for compatibility"
  "i4","tools.ts execute handlers that complete terminal goals may need to become async so they can run terminal workflow safely"
  "i5","context-reset action success still needs branch repair/replay; failure/skipped state must not be interpreted as pending reset"
  "i6","continuation ticket helpers must be usable from lifecycle.ts, tools.ts, queue-tools.ts, and continuation.ts to remove inconsistent handoff logic"
  "i7","validation should shift from source-string inclusion probes toward exported pure helper behavior where possible"
```
