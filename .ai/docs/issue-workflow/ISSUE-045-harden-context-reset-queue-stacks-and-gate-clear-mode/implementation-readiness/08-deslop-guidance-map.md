# 08 — Deslop guidance map

## References used

- `/Users/bryan/.pi/agent/.cache/codex-skills/deslop/SKILL.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/deslop/references/typescript.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/deslop/references/json.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/deslop/references/toml.md`

Reference-selection command:

```bash
python3 /Users/bryan/.pi/agent/.cache/codex-skills/deslop/scripts/deslop-map.py .pi/extensions/goal
```

Primary implementation language: TypeScript. JSON/TOML are only relevant if implementation touches validation metadata or Sentrux config/baseline files; otherwise avoid editing them.

## Issue-specific slop map

```toon
toon.version: 1
slop_map[10]{class,risk,surfaces,review_gate}:
  "semantic","queue repair resurrects the wrong item or duplicates a queue head","queue-state.ts|terminal-workflow.ts|continuation-ticket.ts","queue_payload_repair_probe and manual_tree_replay_probe"
  "integration","navigateTree runs inside update_goal tool execution and desyncs Codex","tools.ts|terminal-workflow.ts|lifecycle.ts","live summarize_queue_stack_live_probe"
  "type_api","new ticket/repair types use loose object/casts or miss sourceQueueId parsing","types.ts|state.ts|continuation-ticket.ts|queue-state.ts","typecheck_goal and no_ts_escape_hatches"
  "architecture","repair logic sprawls into lifecycle/tools instead of queue-state/terminal-workflow ownership","lifecycle.ts|tools.ts|terminal-workflow.ts|queue-state.ts","sentrux gate/check and phase review"
  "duplication","queue event parsing/repair repeats remove/dequeue logic inconsistently","queue-state.ts|queue-tools.ts","dedupe review after Phase 4"
  "error_handling","disabled clear logs/skips as success without visible warning or action state","context-reset.ts|post-completion-actions.ts|ui.ts","clear_default_off_probe"
  "security_input","queue/tool params are trusted without preserving objective/template/action metadata exactly","queue-state.ts|tool-schemas.ts|goal-intent.ts","schema and payload repair probes"
  "test","probes assert source strings rather than observable state transitions",".ai/validation/*.mjs","probe review before quality_goal"
  "performance","repair scans entire branch repeatedly in hot turn path","queue-state.ts|terminal-workflow.ts","bounded helper review; avoid repeated full-branch scans unless necessary"
  "docs","README claims clear works or queue stacks are safe without live proof","README.md|live probe docs","live probe closeout and docs review"
```

## TypeScript hazards to check

- No `as unknown as` or `as any`.
- Avoid non-null assertions for queue head, action, or context capability; narrow explicitly.
- Do not use optional calls like `ctx.navigateTree?.()` followed by success-like state updates; branch on capability and result.
- Do not ignore boolean/result returns from repair or handoff helpers.
- Use discriminated unions for repair outcomes, e.g. `restored | already_present | blocked_different_head | blocked_consumed`.
- Avoid long positional parameters in new terminal/repair helpers; define named `Runtime`, `Deps`, or `RepairInput` types.
- Keep queue revision numeric semantics explicit; no magic revision sentinel values.
- Avoid regex/string-based probes for behavior that can be tested via exported pure helpers/fakes.

## Phase review prompts

### After Phase 2 — clear flag

- Does disabled clear skip before any call to `navigateTree`?
- Is the skip visible/actionable, not silent success?
- Does summarize remain default-enabled?
- Does broad `PI_GOAL_CONTEXT_RESET=0` still disable both modes?

### After Phase 4 — queue repair API

- Are repair helpers the only code that mutates runtime queue and persists repair events together?
- Does replay parse all new event kinds?
- Is manual tree replay still branch-local?
- Does restore refuse ambiguous different-head queues instead of reordering?

### After Phase 6 — terminal workflow barrier

- Is the captured queued payload exact, including template metadata, budgets, floors, and post-completion actions?
- Are source queue items consumed if they reappear after a queued goal's own reset?
- Does action failure still hand off queued work?
- Does repair happen before revalidation and dispatch?

### After Phase 7 — queue-steer generation

- Do all fresh steers include queue revision/generation?
- Are legacy/no-revision steers invalid?
- Does dequeue/start/repair increment revision before any fresh steer?
- Is `lastQueueHandoffKey` revision-aware?

### After Phase 8 — tool timing

- Can `update_goal` return its tool result without `navigateTree` happening inside the tool execute stack?
- Does turn_end still run terminal workflow for completed goals?
- If a deferred fallback exists, does it wait for idle/no pending messages?
- Does the model-tool enqueue/start probe prove one-shot behavior?

## Completion-time deslop closeout requirements

The implementation closeout must report:

- changed files and why each changed;
- behavior intentionally changed: clear default-off, queue repair after automated reset, stale steer invalidation, deferred terminal workflow timing;
- behavior intentionally preserved: isolated summarize reset, template directive parsing, structured tool params, manual branch replay semantics, nonblocking action failure;
- validation commands run and exact results;
- live probe transcript path and whether Codex desync was absent;
- residual risks and follow-ups.

## Do-not-do list

- Do not make queue state globally durable across all manual tree navigation.
- Do not silently turn `clear` into `summarize`.
- Do not add a broad retry loop to hide tool-call desync.
- Do not fix the stale queue-steer loop by weakening queue steering guidance generally.
- Do not introduce private Pi API casts or TypeScript escape hatches.
- Do not update Sentrux baseline unless there is an explicit structural reason and the gate/check story is documented.
