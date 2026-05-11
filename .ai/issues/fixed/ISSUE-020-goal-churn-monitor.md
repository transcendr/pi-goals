# ISSUE-020 — Active persistent third-party churn monitor for pi-goal

Status: fixed — implemented
Priority: P0
Owner: unassigned
Created: 2026-05-08
Next best session: none — implemented
Next best session rationale: Implementation completed with active interval scheduling, persistent monitor invocation, XML parsing, bounded churn log feedback, steering injection, and validation probes.
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on:
- `.ai/docs/pi-goal-future-churn-overseer.md`
- existing Pi steering path used by budget warnings/wrap-up (`pi.sendMessage(..., { deliverAs: "steer" })`)
Related:
- `.ai/issues/open/ISSUE-024-goal-audit-command.md`

Goal: Implement a fully integrated, Pi-native, active, persistent per-goal intelligent churn monitor: a third-party monitor agent receives sparse reports from goal start, keeps per-goal context and a timestamped bounded churn log, judges whether the working agent is in real churn, and injects mid-turn steering into the working agent based on the monitor agent's judgment.

## Correction context

A previous implementation was wrong and has been removed from the codebase. It made two product mistakes:

1. It exposed a manual `/goal churn-check` command, which only helps if the user is already watching and has already noticed churn.
2. It used deterministic counters such as `consecutiveNoProgressTurns` and `consecutiveAutoTurns` as gates for whether the monitor agent should run.

Those are not the requested feature. The requested feature is an active monitor that starts with the goal and receives sparse reports while the goal is active. The monitor agent, not deterministic runtime heuristics, decides whether there is real churn and whether steering is warranted.

## Non-negotiable requirements

- No manual-first `/goal churn-check` UX.
- No deterministic churn parser.
- No deterministic "likely churn" gate before the monitor sees reports.
- No threshold such as no-progress-turn count or auto-turn count may decide whether monitoring happens.
- No runtime cooldown may suppress reports because the runtime thinks the monitor should wait.
- No watered-down phase that only inspects telemetry locally.
- No hard-coded domain-specific classifier tied to the motivating browser/helper anecdote.
- No inline magic numbers for monitor cadence or churn-log feedback length.
- The extension runtime is transport/plumbing. The monitor agent is the judge.
- The monitor must receive sparse reports from goal start/resume while the goal is active.
- The monitor must keep persistent per-goal context across invocations.
- The monitor must keep a timestamped churn log so it can reason about time between reports and avoid impatience.
- The monitor must receive only bounded recent churn-log context; default feedback bound is the last 10 entries.
- The monitor must be instructed to avoid over-aggression and require real identifiable churn before steering.
- If the monitor decides to steer, steering must use Pi-native mid-turn steering delivery, reusing the same class of mechanism as budget warnings/wrap-up: `pi.sendMessage(..., { deliverAs: "steer" })`.

## Configurable constants

Define named constants in `constants.ts` or a dedicated monitor constants module. Do not inline these values inside runtime logic.

- Default report interval: `90` seconds.
- Default recent churn-log feedback limit: `10` entries.
- Report entry/context excerpt limits: named constants, exact values chosen during implementation and documented.
- Monitor process timeout and output cap: named constants, exact values chosen during implementation and documented.

These constants may later become user/project configurable settings. The first implementation only needs named constants and a clear seam for configuration.

## Desired behavior

When a goal is created or resumed:

1. `pi-goal` starts or resumes an associated monitor session for that `goalId`.
2. The monitor receives an initial report containing:
   - goal id, objective, status, budgets, and usage;
   - compact telemetry;
   - session/branch identity where available;
   - current timestamp;
   - elapsed time since goal start and, if applicable, since the previous report;
   - a short explanation of the monitor's role and judgment standard.
3. While the goal remains active, `pi-goal` sends sparse interval reports to the monitor every configured interval, default `90s`.
4. Reports include enough context for judgment but remain bounded:
   - current goal state;
   - compact telemetry;
   - recent relevant transcript/session summary or bounded recent entries;
   - visible signs of current activity where Pi exposes them;
   - timestamp and elapsed time since the previous report;
   - recent churn-log entries for this goal, defaulting to the last `10` entries.
5. The monitor appends or updates its own timestamped churn log.
6. The monitor returns a structured XML decision after each report.
7. If the monitor judges real churn and recommends steering, `pi-goal` injects a steering message into the working agent.
8. If the monitor judges `watch`, no steering is injected.
9. If the monitor judges `escalate`, the user is notified that external input or a decision is needed.
10. If the goal is paused, complete, cleared, replaced, or budget-limited, monitor reports/steering for that goal stop or are stale-ignored.

## Monitor role and prompt requirements

The monitor prompt must make these instructions explicit:

- You are a third-party monitor, not the worker.
- You are project/goal/process-agnostic.
- Your job is to identify real churn that a human reviewer would recognize, not to solve the task.
- Do not be impatient. Long-running hard work is not churn by itself.
- Use timestamps and churn log history to understand time between reports.
- You receive only bounded recent churn-log entries; reason from that bounded history and do not assume omitted log entries are evidence.
- Require identifiable patterns before steering, such as:
  - repeated bad strategy after negative/low-signal evidence;
  - irrelevant artifact fixation;
  - unsupported assumption loop;
  - complexity escalation before trying the smallest direct unblocker;
  - evidence-blind retry;
  - validation tunnel vision;
  - scope drift;
  - thrash without preserving useful state;
  - user escalation needed.
- Task-specific details belong in evidence and steer text, not in stable classifier names.
- If steering, be concise and surgical:
  - identify what to stop doing;
  - name the current bad pattern;
  - tell the worker to step back to first principles;
  - suggest the singular simplest next concrete action likely to unblock progress;
  - do not replace the worker's task plan wholesale;
  - do not mark the goal complete.

## Runtime responsibilities

The extension runtime is responsible for:

- starting/resuming the per-goal monitor session;
- sending sparse reports at the configured active-monitor interval from goal start/resume, default `90s`;
- including timestamps and bounded recent churn-log context in every report, default last `10` entries;
- preserving monitor context per goal, e.g. via a goal-scoped headless `pi --session <session id>` session or equivalent Pi-native session API;
- receiving structured XML monitor decisions;
- parsing model output through a reusable tolerant XML extraction/parsing helper;
- injecting monitor steering through `pi.sendMessage(..., { deliverAs: "steer" })` when the monitor requests steering;
- stale-guarding monitor reports and steering by goal id and status;
- stopping reports/steering for paused, cleared, complete, replaced, or budget-limited goals;
- bounding report size and monitor process output so the monitor does not consume unbounded context.

The extension runtime is **not** responsible for judging churn.

## Reusable model-output parsing helper

The monitor decision parser must not assume pristine model output. Add a properly scoped reusable helper module, for example:

```text
.pi/extensions/goal/model-output.ts
```

The helper should be usable by this feature and future features such as `/goal audit`, completion proof review, or reusable-prompt checks.

Responsibilities:

- Extract an XML payload from:
  - raw XML only;
  - prose before/after XML;
  - Markdown code fences containing XML;
  - multiple fenced blocks, selecting the first matching root tag;
  - common partially malformed output where a bounded repair is safe.
- Normalize whitespace.
- Tolerate missing optional tags.
- Report actionable parse errors for missing required tags.
- Avoid throwing raw parser/library errors into user-facing notices.

Prefer XML over JSON for monitor decisions because models can place natural language inside tags without JSON string escaping, XML can be extracted from prose/code fences more easily, repeated tags such as `<evidence>` are natural, and partially wrapped/malformed output is more salvageable than JSON.

## Monitor decision shape

The monitor decision must be XML, not JSON.

Example:

```xml
<churn_monitor_decision>
  <action>steer</action>
  <confidence>high</confidence>
  <pattern>irrelevant_artifact_fixation</pattern>
  <evidence>The worker has returned to the same helper artifact across multiple reports despite it not being required by the objective.</evidence>
  <evidence>The latest failures do not test the simplest direct validation path.</evidence>
  <steer>Stop adapting the incidental helper. Restate the minimum behavior that must be validated, then run the smallest direct check that can confirm or falsify it.</steer>
  <log_note>Second report showing helper fixation over 7 minutes. Steering is now warranted.</log_note>
</churn_monitor_decision>
```

Required/optional tags:

- `<action>`: required. Allowed values: `watch`, `steer`, `escalate`.
- `<confidence>`: optional but strongly requested. Allowed values: `low`, `medium`, `high`; parser defaults missing/invalid to `low`.
- `<pattern>`: optional.
- `<evidence>`: zero or more tags.
- `<steer>`: required when action is `steer`; ignored otherwise.
- `<log_note>`: optional but strongly requested; parser defaults missing to an empty string plus parse warning metadata if needed.

There is no `none` action. `watch` covers both no-action and weak/ambiguous signals. Keeping both `none` and `watch` would be semantic duplication because both update the log and do not steer.

Allowed actions:

- `watch`: no actionable churn yet, or only weak/ambiguous signals. Append log and continue observing.
- `steer`: monitor sees real churn and provides a concise steering message.
- `escalate`: monitor thinks user input, a user decision, missing credentials, or another external dependency is needed; notify the user instead of letting the worker churn silently.

## Churn log requirements

The churn log must be goal-scoped and timestamped. It must record at least:

- report timestamp;
- monitor decision/action;
- confidence;
- pattern if any;
- short evidence summary;
- whether steering was injected;
- monitor note about why it waited or acted.

The log exists because LLM monitor invocations have weak inherent time awareness. The monitor must receive recent log entries on every invocation so it can judge patience, repetition, and escalation over time.

The monitor must not receive an unbounded churn log. The default feedback limit is the last `10` entries and must be represented as a named constant/config value.

## Pi-native integration expectations

- Use project-local extension modules under `.pi/extensions/goal/`.
- Keep command parsing, lifecycle scheduling, monitor prompt construction, monitor state/logging, structured XML parsing, and steering injection separated.
- Reuse existing hidden steering-message patterns and context stale filtering used for continuation/budget/pause messages.
- Add a dedicated monitor steering custom type only if needed for context filtering and auditability.
- Do not expose monitor internals as the primary user workflow.
- Keep monitor report storage out of provider context unless explicitly included in sparse reports.

## Acceptance criteria

- All previous churn monitor code from the bad implementation is absent before reimplementation begins.
- There is no `/goal churn-check` command or autocomplete entry.
- Creating or resuming an active goal initializes an associated monitor session/context.
- Active goals send sparse reports to the monitor from goal start/resume every configured interval, default `90s`, without waiting for deterministic churn thresholds.
- The report interval and recent churn-log feedback limit are named constants/config values, not inline hard-coded numbers.
- The monitor receives timestamps and bounded recent churn-log entries on every report, default last `10` entries.
- The monitor keeps a goal-scoped churn log across invocations.
- The runtime does not decide whether churn exists using no-progress/auto-turn thresholds or other heuristic gates.
- The monitor decision is requested as XML and parsed through a reusable tolerant XML extraction/parsing helper.
- XML decisions wrapped in prose or Markdown code fences are handled gracefully.
- Missing optional XML tags are tolerated; missing required tags produce actionable parse errors.
- Monitor-requested steering is injected into the working agent with `deliverAs: "steer"` and stale-guarded by goal id/status.
- Monitor `watch` decisions do not inject steering but do update the churn log.
- Monitor `escalate` decisions notify the user without letting stale steering leak into the worker.
- Reports and steering stop or stale-ignore when the goal is paused, budget-limited, complete, cleared, or replaced.
- Sentrux gate/check pass for `.pi/extensions/goal`.
- Pi extension load validation passes.
- TypeScript validation is attempted and result recorded.

## Proof threat model

Primary invariant: the feature is an active intelligent monitor from goal start, not a deterministic local churn detector and not a manual user-triggered check.

False-green risks:

- A monitor module exists but is only invoked after deterministic no-progress/auto-turn thresholds.
- A manual `/goal churn-check` remains and is treated as sufficient.
- The runtime locally decides churn and only asks the monitor to wordsmith a steer.
- The monitor receives telemetry without timestamps/log history and becomes impatient.
- The monitor receives an unbounded churn log and bloats or fixates on old history.
- XML output parsing only works for perfect raw XML and fails on common model wrappers/code fences.
- Steering is generated but not delivered through Pi-native mid-turn steer delivery.
- Stale steering can leak into paused/budget-limited/replaced goals.

Required proof shape:

- Static grep proves no `/goal churn-check` command surface and no deterministic monitor gate names such as `consecutiveNoProgressTurns >=` in monitor scheduling logic.
- Static grep or code inspection proves monitor interval and churn-log feedback length are named constants/config values, with defaults `90s` and `10`.
- A lifecycle/scheduler probe proves reports are scheduled from goal create/resume while active, independent of churn-like telemetry values.
- A monitor prompt/report probe proves timestamps, elapsed/report timing, goal state, telemetry, and bounded recent churn log are included.
- XML parser probes cover raw XML, prose-wrapped XML, Markdown-fenced XML, repeated evidence tags, missing optional tags, and missing required tags.
- A decision parser/injection probe proves `<action>steer</action>` from the monitor produces a `deliverAs: "steer"` message with goal-id details.
- A stale-filter probe proves monitor steering is dropped for paused, budget-limited, complete, cleared, or mismatched goals.
- Sentrux and Pi load validation pass.

## Implementation checklist

- [x] Confirm the bad implementation is removed from code: no `churn.ts`, no churn constants/types, no lifecycle churn hook, no `/goal churn-check`.
- [x] Design monitor module boundaries and add them to Sentrux rules intentionally.
- [x] Add named monitor constants/config defaults: report interval `90s`, recent churn-log feedback limit `10`, report excerpt limits, process timeout, output cap.
- [x] Add reusable tolerant XML/model-output parsing helper.
- [x] Add per-goal monitor state/session/log storage.
- [x] Add active-goal report scheduling from goal creation/resume/session replay while active.
- [x] Add sparse report builder with timestamp, elapsed since previous report, goal state, telemetry, recent bounded context, and bounded recent churn log.
- [x] Add monitor prompt builder with the role/instruction requirements above and XML decision schema.
- [x] Add persistent monitor invocation using Pi-native session mechanics.
- [x] Add XML decision parsing and churn-log append/update.
- [x] Add steering injection using `pi.sendMessage(..., { deliverAs: "steer" })`.
- [x] Add context filtering/stale guards for monitor steering.
- [x] Add focused probes for scheduling, report content, log continuity/bounds, XML parsing, steering injection, escalation handling, and stale filtering.
- [x] Run Sentrux gate/check, Pi load validation, and TypeScript attempt.

## Implementation evidence

Implemented modules:

- `.pi/extensions/goal/monitor.ts`: active interval scheduler, persistent headless Pi monitor invocation, XML decision handling, stale-guarded steering/escalation.
- `.pi/extensions/goal/model-output.ts`: reusable tolerant XML extraction/tag helper for raw, prose-wrapped, and Markdown-fenced XML.
- `.pi/extensions/goal/monitor-state.ts`: goal-scoped timestamped churn-log replay/persistence and bounded recent-log access.
- `.pi/extensions/goal/monitor-report.ts`: sparse report builder with goal state, telemetry, session identity, bounded recent entries, and bounded recent churn log.
- `.pi/extensions/goal/monitor-prompts.ts`: monitor role prompt, XML decision schema, and worker steering prompt.

Validation run after implementation:

- `! rg 'churn-check|consecutiveNoProgressTurns >= 2|consecutiveAutoTurns >= 8|shouldRequestAutomaticReview|runChurnMonitor|recommended_action|```json' .pi/extensions/goal` — passed.
- `rg 'GOAL_MONITOR_REPORT_INTERVAL_SECONDS = 90|GOAL_MONITOR_RECENT_LOG_LIMIT = 10' .pi/extensions/goal/constants.ts` — passed.
- `NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-monitor-schedule-probe.cjs` — passed.
- `NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-monitor-report-probe.cjs` — passed.
- `NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-monitor-xml-parser-probe.cjs` — passed.
- `NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-monitor-steer-probe.cjs` — passed.
- `sentrux gate .pi/extensions/goal` — passed.
- `sentrux check .pi/extensions/goal` — passed.
- `pi --offline --no-session --no-tools -e .pi/extensions/goal/index.ts --list-models` — passed.
- `./node_modules/.bin/tsc --noEmit --target ES2022 --module ESNext --moduleResolution node --ignoreDeprecations 6.0 --types node --strict --skipLibCheck .pi/extensions/goal/*.ts` — passed after adding project-local TypeScript/dev type dependencies.

## Required proofs

required_proofs[10]{name,command,condition}:
  no_bad_churn_code,"! rg 'churn-check|consecutiveNoProgressTurns >= 2|consecutiveAutoTurns >= 8|shouldRequestAutomaticReview|runChurnMonitor' .pi/extensions/goal",exit 0 before reimplementation
  no_manual_command,"! rg 'churn-check' .pi/extensions/goal/command.ts",exit 0
  named_monitor_defaults,"rg 'MONITOR_.*90|CHURN_.*10|REPORT_.*INTERVAL|LOG_.*LIMIT' .pi/extensions/goal",exit 0 after implementation
  monitor_schedule_probe,"NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-monitor-schedule-probe.cjs",exit 0
  monitor_report_probe,"NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-monitor-report-probe.cjs",exit 0
  monitor_xml_parser_probe,"NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-monitor-xml-parser-probe.cjs",exit 0
  monitor_steer_probe,"NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-monitor-steer-probe.cjs",exit 0
  sentrux_gate,"sentrux gate .pi/extensions/goal",exit 0
  sentrux_check,"sentrux check .pi/extensions/goal",exit 0
  pi_load,"pi --offline --no-session --no-tools -e .pi/extensions/goal/index.ts --list-models",exit 0
