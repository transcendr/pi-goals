# 02 — Grounded research

## Files inspected

- `.ai/issues/refine/ISSUE-021-goal-completion-proofs.md`
- `.ai/issues/fixed/ISSUE-036-minimum-goal-spend-floors.md`
- `.ai/issues/open/ISSUE-037-goal-queue-auto-continuation-after-complete.md`
- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/state.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/completion-gate.ts`
- `.pi/extensions/goal/prompts.ts`
- `.pi/extensions/goal/monitor-prompts.ts`
- `.pi/extensions/goal/templates.ts`
- `.pi/extensions/goal/command.ts`

## Current code facts

- `GoalState` currently has objective/status, max budgets, minimum wrap-up floors, usage counters, and timestamps. It has no proof gate schema or proof result history.
- State persistence is branch-replayable through custom `pi-goal-state` entries in `state.ts`; optional proof fields can be backward-compatible if parsed defensively like floor fields.
- `update_goal(status:"complete")` is the primary completion tool path in `tools.ts`.
- ISSUE-036 added `completion-gate.ts`, which already centralizes completion decisions and runs before cancellation/persistence for floor gates.
- Continuation prompts include a qualitative completion audit, but this remains model-executed and not durable proof enforcement.
- Monitor prompts can detect churn and floor-related false-green behavior, but monitor decisions do not execute proof commands.
- Templates support inline commands only at template resolution time when `allow_commands: true`; this is not the right trust boundary for arbitrary completion proof execution.
- Slash command `/goal` has no update/proof subcommand surface today.

## Recent issue evidence

- ISSUE-036 proves hard completion gates can be added cleanly with a shared completion decision module.
- ISSUE-037 demonstrates a live false-green/stop failure after completion, reinforcing that completion needs runtime-enforced invariants and evidence beyond model intent.

## Gap list

- No durable proof gate configuration.
- No proof result persistence or freshness model.
- No trusted runner boundary for proof commands.
- No completion gate branch that blocks completion on missing/stale/failed proofs.
- No UI/tool surface to inspect proof state.
- No live probe proving proof gates block completion before pass and allow completion after pass.

## Additional related-issue pass

After the first writeback, a second research pass inspected related issue surfaces to reduce overlap and sharpen scope:

- `.ai/issues/refine/ISSUE-024-goal-audit-command.md` depends on proof gates and should remain qualitative/bounded audit UX. This confirms ISSUE-021 should implement machine-checkable durable proofs first, not a general audit command.
- `.ai/issues/fixed/ISSUE-020-goal-churn-monitor.md` confirms monitor architecture intentionally delegates judgment to a third-party monitor but keeps runtime as plumbing. ISSUE-021 differs: proof gate pass/fail is deterministic runtime enforcement, not monitor judgment.
- `.ai/issues/fixed/ISSUE-010-goal-update-telemetry-completion-semantics.md` confirms prior false completion telemetry bugs and reinforces that proof gate completion must inspect actual tool result details, not requested status alone.
- `.pi/extensions/goal/tool-results.ts` centralizes tool result details. Proof result summaries should extend this shape so model-visible tool results and telemetry can distinguish proof-blocked completion from ordinary errors.
- `.pi/extensions/goal/monitor-report.ts` already includes floor state in sparse monitor reports. A future implementation can add compact proof state to monitor reports, but monitor awareness is secondary to the deterministic completion gate.

## Architecture sensor

Ran `sentrux gate .pi/extensions/goal` as a planning sensor after adding the execution plan. Result: Quality stayed `6241 -> 6241`, Coupling `0.16 -> 0.16`, Cycles `0 -> 0`, God files `0 -> 0`, and no degradation was detected.

Implication for ISSUE-021: implementation should preserve the current modular separation and avoid expanding `tools.ts` into a god file. The issue now explicitly recommends extracting `proofs.ts` and `proof-runner.ts` rather than concentrating proof logic in the tool handler.

## Adjacent refine issue coordination pass

Inspected adjacent refine issues:

- ISSUE-015 subgoals: completion proofs should be designed so later subgoals can have proof gates, but first release should gate only top-level goal completion. The issue's acceptance criteria already says completion audit should check incomplete subgoals; proof gates will eventually become one evidence source for that audit.
- ISSUE-022 checkpoints/history: checkpoints should summarize recent proof results once ISSUE-021 exists, but checkpoints are not required for first proof gates. Proof result excerpts must stay bounded so future checkpoints can reference them without provider-context bloat.
- ISSUE-023 dependency triggers/watchers: watchers and proof commands share bounded command-execution concerns, but their semantics differ. Proof commands are completion evidence run on demand; watchers are wait-condition triggers. Shared runner primitives may emerge later, but ISSUE-021 should not block on watcher design.

## Runner safety research pass

Inspected `monitor.ts`, `constants.ts`, `model-output.ts`, and `templates.ts` for existing bounded execution patterns.

Findings:

- `monitor.ts` uses `pi.exec` with named timeout/output constants and stale-guards monitor decisions before applying steering.
- `templates.ts` uses `/bin/bash -lc` for inline commands only when `allow_commands: true`, with timeout and max-buffer/output truncation.
- These patterns support ISSUE-021's proof-runner design, but neither monitor output nor template inline commands should become proof pass/fail authority. Proof gates must remain explicit, bounded, deterministic, and persisted.

Detailed notes: `13-runner-safety-research.md`.

## BCU/ChatGPT research attempt

A BCU/Safari ChatGPT research pass was attempted but blocked before a research prompt could be submitted. No external ChatGPT claims are used in the issue. Details are recorded in `14-bcu-external-research-attempt.md`.
