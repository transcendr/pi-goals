# 04 — Patch sequence

## Preconditions

```toon
toon.version: 1
preconditions[5]{id,condition,command_or_check}:
  "p1","worktree state is understood before implementation","git status --short --untracked-files=all"
  "p2","Sentrux baseline saved before extension edits","sentrux gate --save .pi/extensions/goal"
  "p3","no TypeScript escape-hatch casts introduced","! rg -n 'as unknown as|as any' .pi/extensions/goal"
  "p4","implementation follows locked default-on env kill-switch contract","PI_GOAL_POST_COMPLETION_ACTIONS and PI_GOAL_CONTEXT_RESET disabled values are 0,false,no,off"
  "p5","implementation preserves legacy ISSUE-043 replay","legacy replay probe added before final quality gate"
```

## Ordered patch plan

### Phase 1 — Baseline and failing/guard probes

1. Run and save baseline:
   ```bash
   sentrux gate --save .pi/extensions/goal
   ```
2. Create initial validation probes under `.ai/validation/` as failing or source/behavior guards before implementation where practical:
   - `goal-intent-normalization-probe.mjs`
   - `goal-template-raw-context-directive-probe.mjs`
   - `goal-tool-post-completion-actions-schema-probe.mjs`
   - `goal-continuation-ticket-probe.mjs`
   - `goal-post-completion-action-failure-nonblocking-probe.mjs`
   - `goal-compaction-continuation-ticket-probe.mjs`
   - `goal-post-completion-feature-flag-probe.mjs`
   - `goal-post-completion-legacy-replay-probe.mjs`
3. Edit existing probes only after the new expected behavior is clear:
   - invert `goal-context-reset-failure-probe.mjs` so failure warning is still asserted but blocked handoff is no longer asserted;
   - adjust clear/summarize handoff probes so success still requires reset before dispatch, but failure/skipped path is nonblocking.

Validation checkpoint:

```bash
node .ai/validation/goal-continuation-ticket-probe.mjs || true
node .ai/validation/goal-template-raw-context-directive-probe.mjs || true
```

Expected early state: new probes may fail until implementation lands; failures should be meaningful, not syntax errors.

Rollback: remove newly added validation files if abandoning the patch before code changes.

### Phase 2 — Shared types and feature flags

4. Edit `.pi/extensions/goal/types.ts`:
   - add `PostCompletionActionType`, `ContextResetMode`, `PostCompletionActionSpec`, `PostCompletionActionStatus`, `ContextResetPostCompletionActionState`, `PostCompletionActionState`;
   - add `postCompletionActions?: PostCompletionActionState[]` to `GoalState`;
   - keep legacy reset fields;
   - add any `ContinuationTicket` support types only if not placed fully in `continuation-ticket.ts`.
5. Create `.pi/extensions/goal/feature-flags.ts`:
   - implement `getGoalFeatureFlags(env = process.env)`;
   - implement disabled-value helper: case-insensitive `0`, `false`, `no`, `off`;
   - default both flags to enabled.

Validation checkpoint:

```bash
npm run typecheck:goal
node .ai/validation/goal-post-completion-feature-flag-probe.mjs
```

Rollback: revert `types.ts` additions and delete `feature-flags.ts` if typecheck cannot be stabilized.

### Phase 3 — Intent normalization and template parser export

6. Edit `.pi/extensions/goal/templates.ts`:
   - export `GoalTemplateInvocation` type;
   - export `parseGoalTemplateInvocation(input)` by renaming/exposing current private `parseInvocation`;
   - keep existing public resolver behavior unchanged.
7. Create `.pi/extensions/goal/goal-intent.ts`:
   - move/copy trailing directive parser out of `context-reset.ts` into this module;
   - implement structured/prose action merge and conflict rules;
   - implement direct and template intent builders;
   - ensure template builder strips trailing directive from raw invocation before calling template resolver.
8. Update imports in current parser users to compile, initially by re-exporting parser from `context-reset.ts` or directly switching imports to `goal-intent.ts`.

Validation checkpoint:

```bash
node .ai/validation/goal-intent-normalization-probe.mjs
node .ai/validation/goal-template-raw-context-directive-probe.mjs
npm run typecheck:goal
```

Rollback: keep `parseGoalTemplateInvocation` export if harmless; otherwise revert Phase 3 as a unit.

### Phase 4 — State and queue action persistence compatibility

9. Edit `.pi/extensions/goal/state.ts`:
   - extend `CreateGoalStateInput` with `postCompletionActions?: PostCompletionActionState[]`;
   - write `postCompletionActions` in `createGoalState`;
   - parse/validate `postCompletionActions` in `toGoalState`;
   - synthesize action state from legacy reset fields when actions absent.
10. Edit `.pi/extensions/goal/queue-state.ts`:
   - extend `QueuedGoal` with `postCompletionActions?: PostCompletionActionSpec[]`;
   - extend `enqueueGoal` opts with `postCompletionActions`;
   - persist/parse action specs defensively;
   - synthesize specs from legacy `postCompletionContext` when actions absent.
11. Add small helper functions in `post-completion-actions.ts` if needed for validation/synthesis to avoid duplicating parsing in state and queue-state.

Validation checkpoint:

```bash
node .ai/validation/goal-post-completion-legacy-replay-probe.mjs
npm run typecheck:goal
```

Rollback: because state replay is sensitive, revert Phase 4 as one unit if legacy replay fails.

### Phase 5 — Action runner and context reset adapter

12. Create `.pi/extensions/goal/post-completion-actions.ts`:
   - implement action-state creation from specs;
   - implement runnable action filtering for `goal.status === "complete"` only;
   - implement `recordPostStartActionAnchors` for context.reset actions;
   - implement `runPostCompletionActionsSafely` with try/catch around runner calls;
   - persist `running`, `done`, `failed`, and `skipped` action states;
   - notify warnings through `ui.ts` for failed actions.
13. Refactor `.pi/extensions/goal/context-reset.ts`:
   - leave command-context capture/status/clear helpers;
   - provide context reset anchor helper used by `recordPostStartActionAnchors`;
   - provide `createContextResetActionRunner(flags)`;
   - use existing `navigateTree` behavior for successful clear/summarize;
   - convert old failure cases into action-runner failed results, not lifecycle returns;
   - remove or deprecate `needsPostCompletionContextReset` and `attemptPostCompletionContextReset` from new call sites.
14. Edit `.pi/extensions/goal/ui.ts`:
   - replace blocked-handoff wording with nonblocking action-failure wording;
   - add helper such as `notifyPostCompletionActionFailure(ctx, message)`;
   - keep failures actionable, including `/goal anchor` guidance when missing capability is the cause.

Validation checkpoint:

```bash
node .ai/validation/goal-post-completion-action-failure-nonblocking-probe.mjs
node .ai/validation/goal-context-reset-summarize-handoff-probe.mjs
npm run typecheck:goal
```

Rollback: if branch repair breaks, preserve new intent/type modules but temporarily route runner to no-op behind flag until adapter is fixed.

### Phase 6 — Continuation tickets and terminal workflow

15. Create `.pi/extensions/goal/continuation-ticket.ts`:
   - implement `decideTerminalContinuationTicket` for complete and budget-limited queue handoff cases;
   - implement revalidation by `goalId` and `queueId`;
   - implement dispatch via existing `sendQueueHandoff`;
   - ensure action status is never part of revalidation.
16. Create `.pi/extensions/goal/terminal-workflow.ts`:
   - decide ticket before actions;
   - run safe actions with selected runner;
   - sync UI;
   - revalidate/dispatch ticket after actions;
   - return latest goal state.
17. Edit `.pi/extensions/goal/index.ts`:
   - call `getGoalFeatureFlags()`;
   - create runner strategy: no-op if `postCompletionActions` disabled, context reset runner otherwise;
   - pass terminal workflow/runtime dependencies to lifecycle/tools/queue tools.
18. Edit `.pi/extensions/goal/lifecycle.ts`:
   - remove direct imports of `attemptPostCompletionContextReset` / `needsPostCompletionContextReset` from normal paths;
   - in `finishTurnGoal`, call terminal workflow instead of manual reset/handoff branch;
   - in `handleAgentEnd`, call terminal workflow instead of manual reset/handoff branch;
   - keep budget warning/hard-stop logic unchanged except dispatch uses ticket helper where appropriate.
19. Edit `.pi/extensions/goal/tools.ts`:
   - make tool completion path async where needed;
   - replace `queueHandoffAfterToolUpdate` direct reset gate with terminal workflow/ticket dispatch;
   - budget-limited queue handoff uses ticket but post-completion actions skip because status is not complete.
20. Edit `.pi/extensions/goal/queue-tools.ts`:
   - replace `sendNextQueueHandoffAfterDequeue` reset gate with continuation ticket dispatch;
   - do not run post-completion actions on dequeue unless implementation discovers a specific stale-pending case; normal action attempt is terminal workflow.
21. Edit `.pi/extensions/goal/continuation.ts`:
   - for compaction `queueHandoff` work, use `ContinuationTicket` decision/revalidation/dispatch helpers;
   - preserve existing retry delays and telemetry semantics;
   - ensure action failures/skips are not part of compaction skip reasons.

Validation checkpoint:

```bash
node .ai/validation/goal-continuation-ticket-probe.mjs
node .ai/validation/goal-compaction-continuation-ticket-probe.mjs
node .ai/validation/goal-complete-queue-handoff-probe.mjs
node .ai/validation/goal-complete-queue-dedupe-probe.mjs
npm run typecheck:goal
```

Rollback: if ticket dispatch destabilizes compaction, keep ticket pure helper and revert only continuation.ts integration first; lifecycle/tools can still use tickets.

### Phase 7 — Tool schemas and command/queue integration

22. Edit `.pi/extensions/goal/tools.ts` schemas:
   - add `post_completion_context` and `post_completion_actions` to `CreateGoalParams` and `CreateGoalFromTemplateParams`;
   - update TypeScript input types;
   - route params through `goal-intent.ts`;
   - ensure structured params show in model tool schemas.
23. Edit `.pi/extensions/goal/queue-tools.ts` schema:
   - add `post_completion_context` and `post_completion_actions` to enqueue params;
   - route through `goal-intent.ts`;
   - persist queued action specs.
24. Edit `.pi/extensions/goal/command.ts`:
   - route slash direct/template/queue block/single queue through `goal-intent.ts`;
   - store template metadata with cleaned args;
   - create active goal action states using `createPostCompletionActionStates`;
   - record anchors with `recordPostStartActionAnchors`.
25. Keep `/goal anchor` behavior intact as command-context capability capture, not reset target.

Validation checkpoint:

```bash
node .ai/validation/goal-tool-post-completion-actions-schema-probe.mjs
node .ai/validation/goal-intent-normalization-probe.mjs
node .ai/validation/goal-context-reset-anchor-command-probe.mjs
node .ai/validation/goal-context-reset-model-tool-policy-probe.mjs
npm run typecheck:goal
```

Rollback: if structured params destabilize tool schemas, temporarily keep `post_completion_context` only while preserving internal action model; do not revert raw template directive fix.

### Phase 8 — Docs and final deterministic validation

26. Edit `README.md`:
   - explain trailing prose directives are parsed from raw direct/template/queue input;
   - document structured tool params `post_completion_context` and `post_completion_actions`;
   - document default-on env kill switches;
   - change failure semantics from blocked handoff to visible/nonblocking action failure;
   - clarify `/goal anchor` remains capability capture only.
27. Update old context-reset probes for new nonblocking semantics.
28. Run deterministic validation sequence:
   ```bash
   node .ai/validation/goal-intent-normalization-probe.mjs
   node .ai/validation/goal-template-raw-context-directive-probe.mjs
   node .ai/validation/goal-tool-post-completion-actions-schema-probe.mjs
   node .ai/validation/goal-continuation-ticket-probe.mjs
   node .ai/validation/goal-post-completion-action-failure-nonblocking-probe.mjs
   node .ai/validation/goal-compaction-continuation-ticket-probe.mjs
   node .ai/validation/goal-post-completion-feature-flag-probe.mjs
   node .ai/validation/goal-post-completion-legacy-replay-probe.mjs
   for f in $(ls .ai/validation/goal-context-reset-*.mjs | sort); do node "$f" || exit $?; done
   ! rg -n 'as unknown as|as any' .pi/extensions/goal
   npm run quality:goal
   ```
29. Run Sentrux comparison explicitly if `npm run quality:goal` failure needs isolation:
   ```bash
   sentrux gate .pi/extensions/goal
   sentrux check .pi/extensions/goal
   ```

Rollback: if final quality fails due architecture growth, inspect Sentrux output first; prefer extracting small helpers over reverting the architectural boundary.

### Phase 9 — Live probe

30. Follow `.ai/docs/pi-goals-live-probe-testing.md`.
31. Prefer existing `pi-goals-live-probe` process.
32. Probe scenarios:
   - `/reload` after build changes;
   - direct slash goal with `and summarize context` still works;
   - template invocation `/goal repo-worktree-inventory -- current state and summarize context` records/action-runs summarize policy;
   - queued goal where context reset is disabled with `PI_GOAL_CONTEXT_RESET=0` or otherwise forced skipped still proceeds to next queued goal and records visible skipped/failure status;
   - cleanup with `/goal clear` and `/goal queue` confirming no unintended queue.
33. Capture closeout under `/tmp` unless reusable scenario docs require update.

## Stop conditions

```toon
stop_conditions[6]{id,condition,action}:
  "s1","sentrux baseline cannot be saved","stop and report before code edits"
  "s2","structured tool schemas cannot represent action array with current TypeBox/Pi tools","fall back to post_completion_context only temporarily, record blocker, do not abandon internal action model"
  "s3","legacy replay cannot be made safe without deleting old fields","stop; do not break existing sessions"
  "s4","context reset adapter needs private SessionManager casts","stop; do not violate no escape-hatch rule"
  "s5","action failure still suppresses expected queue handoff in any auto-continuation path","do not mark complete; fix ticket/workflow integration"
  "s6","live probe leaves dirty goal/queue state","clean up before closeout or explicitly report blocker"
```

## Handoff first action

The implementation agent should start by running:

```bash
git status --short --untracked-files=all
sentrux gate --save .pi/extensions/goal
```

Then create Phase 1 validation probes before touching implementation modules.
