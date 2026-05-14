# 04 — Proof threat model for ISSUE-023

## Primary invariant

Watcher registrations are opt-in, bounded, visible, cancelable, reload-safe, and bound to one effective local-active goal; when a condition is satisfied, at most one stale-guarded nudge is delivered to the correct active goal, and no watcher can execute unbounded work or wake a paused, complete, budget-limited, external, stale, or wrong-worktree goal.

## High-risk false greens

1. Watcher condition tests pass in isolation, but reload duplicates timers or loses registrations.
2. A satisfied watcher nudges the wrong goal after replacement, focus/switch, or stale branch replay.
3. A watcher keeps firing after pause, clear, complete, budget limit, timeout, or cancel.
4. Command watchers become an unbounded shell/job-runner surface.
5. File contains watchers read unbounded files or hide truncation/no-match states.
6. Busy context/pending user message still receives a follow-up turn.
7. External or non-local-active multi-goal records receive current-session nudges.
8. List/cancel UI hides active/satisfied/expired watchers, so agents cannot clean them up.
9. Existing single-goal/idle-nudge behavior regresses.

## Deterministic proof strategy

Deterministic probes should simulate watcher state/replay and scheduler decisions without waiting real wall-clock durations:

- registration schema/cap probe for watcher types, intervals, timeouts, output caps, and per-goal/session counts;
- replay/reload probe for registration, satisfaction, cancel, timeout, and delivery state;
- stale guard probe for wrong goal id, paused/complete/budget-limited/cleared goal, pending messages, busy context, and cwd mismatch;
- one-shot delivery probe ensuring satisfaction produces at most one nudge;
- command safety probe ensuring argv-only command execution, timeout, output cap, no stdin, and failure/no-match statuses;
- list/cancel rendering probe ensuring AXI-friendly status rows and idempotent cancel.

## Live proof strategy

If implementation actually polls timers or runs commands/files inside Pi runtime, deterministic tests alone are not enough. A bounded live probe should register disposable file and command watchers, trigger them, verify one correct follow-up/nudge or recorded delivery state, then cancel/clean up watcher files. If implementation only lands planning docs or deterministic-only scaffolding, record an explicit live-probe skip rationale.

## Required proof rows

```toon
toon.version: 1
required_proofs[8]{name,source,command,pass_condition,scope,notes}:
  "quality_goal","ISSUE-023","cd ~/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0","run","full extension quality gate after implementation"
  "watcher_schema_caps_probe","ISSUE-023","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-watcher-schema-caps-probe.mjs","exit 0 and output includes PASS watcher_schema_caps_enforced","run","must fail if watcher kind parsing, interval/timeout/output caps, cwd binding, or per-goal/session counts are unbounded"
  "watcher_replay_reload_probe","ISSUE-023","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-watcher-replay-reload-probe.mjs","exit 0 and output includes PASS watcher_replay_reload_safe","run","must fail if registrations/satisfaction/cancel/timeout/delivery state are lost or duplicated across replay/reload"
  "watcher_stale_guard_probe","ISSUE-023","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-watcher-stale-guard-probe.mjs","exit 0 and output includes PASS watcher_stale_guards_block_invalid_nudges","run","must cover wrong goal id, paused, complete, clear, budget-limited, pending messages, busy context, and cwd mismatch"
  "watcher_one_shot_delivery_probe","ISSUE-023","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-watcher-one-shot-delivery-probe.mjs","exit 0 and output includes PASS watcher_delivers_at_most_once","run","must fail if one satisfied watcher can deliver more than one nudge without explicit re-arm"
  "watcher_command_safety_probe","ISSUE-023","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-watcher-command-safety-probe.mjs","exit 0 and output includes PASS watcher_command_safety_bounds","run","must fail if command watchers accept shell strings, interactive stdin, missing timeouts, output overflow, or unreported nonzero exits"
  "watcher_render_cancel_probe","ISSUE-023","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-watcher-render-cancel-probe.mjs","exit 0 and output includes PASS watcher_render_cancel_axi","run","must fail if list output hides active/terminal watcher state or cancel is not idempotent/actionable"
  "watcher_live_probe_or_skip","ISSUE-023","cd ~/dev/personal/experiments/pi-goals && test -s .ai/validation/goal-watcher-live-probe-closeout.md","exit 0","run","record disposable live watcher evidence if runtime polling/command execution is implemented, or an explicit deterministic-coverage skip rationale"
```

## Proof-to-risk mapping

| Risk | Proof rows |
| --- | --- |
| reload duplicates/loss | `watcher_replay_reload_probe` |
| wrong/stale goal nudge | `watcher_stale_guard_probe`, `watcher_one_shot_delivery_probe` |
| fires after pause/complete/clear/budget/cancel | `watcher_stale_guard_probe`, `watcher_replay_reload_probe` |
| unbounded command runner | `watcher_schema_caps_probe`, `watcher_command_safety_probe` |
| hidden list/cancel state | `watcher_render_cancel_probe` |
| live timer/process integration broken | `watcher_live_probe_or_skip` |
| existing extension regressions | `quality_goal` |
