# Prototype design — monitor semantics and steering-latency analysis for `pi-goals`

Date: 2026-05-10
Status: design report / implementation plan
Scope: project-local `pi-goals` extension and Pi session transcript surfaces

## Executive summary

`pi-goals` already has a goal-scoped churn monitor that periodically sends sparse reports to a headless monitor agent and injects `pi-goal-monitor-steer` messages when the monitor decides to intervene. The current design is intentionally sparse and agentic, but its fixed interval and delivery semantics can produce avoidable delay and stale guidance.

This report proposes a prototype system with two coupled halves:

1. **Monitor semantics capture and analysis** — an offline and runtime analytics layer that reconstructs monitor reports, monitor decisions, steering delivery, worker reaction, and stale/no-longer-applicable cases from Pi session JSONL plus `pi-goal` custom entries.
2. **Adaptive token-aware monitor scheduling and delivery** — a runtime redesign that preserves the invariant “the monitor agent judges churn” while replacing fixed sparse polling with an event-driven, adaptive cadence, freshness guards, and compact semantic digests.

The key implementation idea is to let deterministic code decide **when and what to report**, not **whether churn exists**. The monitor agent remains the sole churn judge. Runtime signals such as repeated error fingerprints, no-tool planning loops, status-only auto turns, scope shifts, and user corrections should trigger sooner or richer monitor reports, while low-risk periods should use cheap heartbeats or slower cadence.

## Important terminology: steering types are distinct

Do not conflate these channels:

| Custom type | Scenario | Owner | Meaning |
|---|---|---|---|
| `pi-goal-continuation` | Goal lifecycle auto-continuation | `continuation.ts` | Tells the worker to continue an active goal after an agent turn. This is **not** churn-monitor steering. |
| `pi-goal-monitor-steer` | Third-party churn monitor intervention | `monitor.ts` / monitor agent | Tells the worker to redirect after the monitor judged real churn or drift. |
| `pi-goal-budget-limit` | Budget warning / wrap-up | budget lifecycle | Tells the worker to wrap up or stop due to budget state. |
| `pi-goal-pause` | Pause / interruption | goal lifecycle | Tells the worker a goal was paused. |
| `pi-goal-queue-steer` | Queue handoff | queue lifecycle | Tells the worker to process queued goals. |

This report focuses on `pi-goal-monitor-steer` and the monitor-decision pipeline. Auto-continuation loops can be analyzed as worker behavior or as a source of context noise, but they are not monitor steering.

## Local research basis

This report is grounded in local project surfaces, not web research. Because no external web research was needed, no Solo web-research agent was launched. If future work adds external literature or vendor API research, launch a Solo agent with Codex runtime and `--profile solo-researcher-strong` as required by the goal.

Primary local evidence inspected:

- Pi session format docs:
  - `/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/docs/session-format.md`
  - `/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/docs/sessions.md`
- Pi extension docs:
  - `/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md`
- `pi-goals` runtime modules:
  - `.pi/extensions/goal/monitor.ts`
  - `.pi/extensions/goal/monitor-prompts.ts`
  - `.pi/extensions/goal/monitor-report.ts`
  - `.pi/extensions/goal/monitor-state.ts`
  - `.pi/extensions/goal/lifecycle.ts`
  - `.pi/extensions/goal/continuation.ts`
  - `.pi/extensions/goal/state.ts`
  - `.pi/extensions/goal/types.ts`
  - `.pi/extensions/goal/constants.ts`
- Prior issue record:
  - `.ai/issues/fixed/ISSUE-020-goal-churn-monitor.md`
- Project live-probe guidance:
  - `.ai/docs/pi-goals-live-probe-testing.md`
- Pi session transcripts under:
  - `/Users/bryan/.pi/agent/sessions/--Users-bryan-dev-personal-experiments-pi-goals--/*.jsonl`

## Current implementation summary

Current monitor flow:

1. `scheduleGoalMonitor()` starts a timer for active goals.
2. Initial monitor run is scheduled after `25ms`.
3. Follow-up monitor cycles run every `GOAL_MONITOR_REPORT_INTERVAL_SECONDS`, currently `90` seconds.
4. `buildGoalMonitorReport()` creates a sparse report containing:
   - goal id/objective/status/budgets/usage;
   - telemetry;
   - session cwd/id/branch entry count;
   - recent branch entries, limited by `GOAL_MONITOR_RECENT_BRANCH_ENTRY_LIMIT = 12`;
   - recent monitor logs, limited by `GOAL_MONITOR_RECENT_LOG_LIMIT = 10`.
5. `invokeMonitorAgent()` runs a headless Pi subprocess:
   - `pi --session .pi/goal-monitor/sessions/pi-goal-monitor-<goalId>.jsonl --no-tools --no-context-files --no-extensions --no-skills --no-prompt-templates --print <prompt>`
   - timeout is `GOAL_MONITOR_PROCESS_TIMEOUT_MS = 240_000`.
6. `parseGoalMonitorDecision()` extracts XML from monitor output.
7. `persistMonitorDecisionLog()` appends a `custom` entry with `customType: "pi-goal-monitor-log"`.
8. If the current goal still matches and the decision is `steer`, `injectMonitorSteer()` sends a hidden custom message:
   - `customType: "pi-goal-monitor-steer"`
   - `details.kind: "monitorSteer"`
   - `details.goalId`, `details.reportId`, `details.createdAt`
   - delivery: `pi.sendMessage(..., { deliverAs: "steer" })`
9. Context filtering retains only the latest status-compatible goal-steering message and drops mismatched goal/status messages.

Critical delivery behavior from Pi core:

- `pi.sendMessage(..., { deliverAs: "steer" })` while streaming queues a steer for the agent loop.
- If not streaming and `triggerTurn` is not set, Pi appends the custom message to session state but does **not** start a new LLM turn.
- Current monitor steering does not set `triggerTurn`.

That means an important steer can be immediate in the session file yet dormant from the worker’s perspective until another turn is triggered by continuation, user input, or other work.

## Transcript evidence snapshot

A local transcript scan found these unique counts across the project session files:

| Metric | Observed value |
|---|---:|
| Unique `pi-goal-monitor-log` records | 241 |
| `watch` decisions | 234 |
| `steer` decisions | 6 |
| `escalate` decisions | 1 |
| Unique `pi-goal-monitor-steer` custom messages | 6 |
| Median interval between monitor log records for the same goal | ~97.3s |
| Minimum interval | ~14.9s |
| Maximum interval | ~13,377s, mostly session/resume/replay gaps |

Observed steer records:

| Timestamp | Report id | Pattern / steer summary | Notes |
|---|---|---|---|
| `2026-05-09T16:45:27Z` | `3b37afd0-8ea9-4581-94be-93a31ad844de` | Stop following Sentrux metrics; run targeted validation. | First matching transcript instance; also appears through replay. |
| `2026-05-10T01:01:34Z` | `4fb0ae89-c738-45ab-b3d2-ff020a5297e9` | Stop implementation; create/verify Solo planning graph. | Later judged partly stale/incorrect because the graph already existed when checked. |
| `2026-05-10T01:03:22Z` | `38e90df8-cc82-473b-a646-a9fead7a93f6` | Stop code/probes; verify epic todo. | Repeated steering on same theme. |
| `2026-05-10T01:04:59Z` | `f54d27eb-43a9-446e-b06f-a42476f02f6e` | Stop validation/probes; verify missing Solo setup. | Repeated steering on same theme. |
| `2026-05-10T13:51:26Z` | `21623ddf-b1cb-484a-bdbe-3cbc75993f73` | Stop timeout change; resume deslop timer workflow. | Followed by user correction/timer protocol change. |
| `2026-05-10T14:35:05Z` | `acbd20f6-3671-416a-9994-35afdab0594a` | Stop continuation/status announcements; directly edit `queue-state.ts`. | Useful example of monitor reacting to an administrative loop. |

Observed injection/session-entry latency from monitor-log append time to `custom_message` entry ranged from ~1ms to ~32.7s in the sampled steers. The longer cases are consistent with the extension queuing/appending while the agent loop and session event pipeline are busy; the more important user-visible latency is reaction latency, not just session write latency.

A concrete stale/semantic-latency example exists in the session history: after Solo planning-graph steers, the assistant later said the steering was “mostly not accurate at the time it fired” and “stale/incorrect” because the mandated Solo setup already existed by the time it checked. This is a semantic freshness problem, not a `pi-goal-continuation` problem.

## Problem statement

The current sparse monitor is intentionally patient, but it has five latency/freshness weaknesses:

1. **Detection latency** — bad patterns can start just after a report and wait up to the next fixed interval plus monitor processing time.
2. **Process latency** — every monitor cycle launches a headless Pi process and waits for model output.
3. **Delivery latency** — `deliverAs: "steer"` without `triggerTurn` can append a steer while idle without making the worker read it immediately.
4. **Semantic stale latency** — a monitor decision can be based on an older report window; by the time the worker sees it, goal state, Solo state, user instructions, queue phase, or branch context may have changed.
5. **Token waste** — fixed reports send similar bounded recent context even when nothing risk-relevant changed, while risk-heavy periods may still wait for the same interval.

## Desired prototype outcomes

The prototype should answer these questions from real transcripts and runtime data:

1. What monitor decisions were made, and why?
2. What was the observed worker context at report time?
3. How long elapsed from first visible bad-pattern evidence to monitor report, decision, steer injection, worker reaction, and resolved progress?
4. Did a steer become stale before delivery or before reaction?
5. Did the worker follow, ignore, supersede, or explicitly reject the steer?
6. Which report content was token-useful versus redundant?
7. Which event patterns would have justified earlier monitor attention without hard-coding a churn verdict?

## Proposed system architecture

```text
Pi session JSONL / runtime events
        │
        ▼
Monitor Semantics Collector
        │
        ├─ Normalized event ledger
        │    - goal state events
        │    - monitor reports/logs
        │    - monitor steers
        │    - continuation/budget/queue steering, separated by type
        │    - assistant/tool/user reactions
        │
        ├─ Offline Transcript Analyzer
        │    - branch-aware JSONL parser
        │    - latency metrics
        │    - stale/no-longer-applicable detection
        │    - report generation
        │
        └─ Runtime Adaptive Monitor Scheduler
             - low-cost event fingerprints
             - risk/novelty-triggered report cadence
             - token budgeter
             - freshness validator
             - monitor-agent broker
             - steer delivery/reaction tracker
```

### Component 1 — branch-aware transcript analyzer

Purpose: reconstruct monitor semantics from existing session JSONL.

Inputs:

- Session JSONL entries from `~/.pi/agent/sessions/...`.
- Optional current branch leaf id when available.
- `custom` entries:
  - `pi-goal-state`
  - `pi-goal-monitor-log`
- `custom_message` entries:
  - `pi-goal-monitor-steer`
  - `pi-goal-continuation`
  - `pi-goal-queue-steer`
  - budget/pause messages
- `message` entries:
  - user corrections;
  - assistant text;
  - tool calls and tool results.

Outputs:

- `MonitorDecisionTimeline[]`
- `SteeringDeliveryTimeline[]`
- `ReactionClassification[]`
- Markdown/TOON report summaries.

Branch-awareness matters because Pi sessions are trees. The analyzer should either:

- analyze the active branch via parent traversal; or
- clearly label cross-branch/replay records as non-active evidence.

### Component 2 — normalized monitor semantics ledger

Proposed record types:

```ts
type MonitorObservationEvent = {
  version: 1;
  goalId: string;
  at: number;
  branchLeafId?: string;
  branchEntryCount: number;
  source: "message" | "tool" | "goal_state" | "queue" | "monitor" | "solo";
  kind: string;
  summary: string;
  fingerprint?: string;
  tokenEstimate: number;
  relevance: "goal" | "monitor" | "workflow" | "noise";
};

type MonitorReportEnvelope = {
  version: 1;
  reportId: string;
  goalId: string;
  builtAt: number;
  observedThroughEntryId?: string;
  observedThroughBranchCount: number;
  trigger: "initial" | "heartbeat" | "risk" | "phase_change" | "user_correction" | "long_running";
  triggerEventIds: string[];
  tokenBudget: number;
  includedObservationIds: string[];
};

type MonitorDecisionRecord = {
  version: 1;
  goalId: string;
  reportId: string;
  decisionId: string;
  at: number;
  action: "watch" | "steer" | "escalate";
  confidence: "low" | "medium" | "high";
  pattern?: string;
  evidenceSummary: string;
  steerInjected: boolean;
  logNote: string;
};

type MonitorSteeringDelivery = {
  version: 1;
  goalId: string;
  reportId: string;
  steerId: string;
  createdAt: number;
  appendedAt?: number;
  deliveredMode: "steer" | "followUp" | "triggeredSteer" | "nextTurn";
  validUntil: number;
  observedThroughEntryId?: string;
  supersededByReportId?: string;
  staleReason?: string;
};

type MonitorReactionRecord = {
  version: 1;
  goalId: string;
  reportId: string;
  steerId: string;
  firstAssistantAt?: number;
  firstToolAt?: number;
  firstProgressAt?: number;
  classification: "followed" | "ignored" | "superseded" | "explicitly_rejected" | "stale_ignored" | "unclear";
  evidence: string[];
};
```

### Component 3 — latency metrics

The analyzer and runtime should compute separate latencies instead of one vague “late steering” number.

| Metric | Formula | Meaning |
|---|---|---|
| Evidence-to-report latency | `report.builtAt - firstRiskEvidenceAt` | How long bad-pattern evidence waited before the monitor saw it. |
| Report-to-decision latency | `decision.at - report.builtAt` | Monitor process/model time. |
| Decision-to-session latency | `customMessage.appendedAt - decision.at` | Time to append steer into session. |
| Session-to-context latency | `firstContextWithSteerAt - customMessage.appendedAt` | Time until the worker’s model payload can include the steer. |
| Context-to-reaction latency | `firstReactionAt - firstContextWithSteerAt` | Time until the worker actually acts/responds. |
| Semantic stale interval | `reactionAt - stateChangedAt` when state changed after report | How long a stale steer persisted. |
| Token cost per useful intervention | `sum(reportTokens)/followedSteerCount` | Efficiency of monitor reporting. |
| Redundancy ratio | `duplicateObservationTokens / totalReportTokens` | How much report context repeats prior reports. |

### Component 4 — adaptive event-driven scheduler

The scheduler should not decide churn. It should decide report cadence and report shape.

Current fixed schedule:

```text
initial report at ~25ms
then every 90s while active
```

Proposed adaptive schedule:

```text
initial report at goal start
baseline heartbeat max interval: 90-180s
risk-triggered report debounce: 5-15s
phase-change report: immediate or short debounce
long-running tool heartbeat: periodic compact status
post-steer follow-up report: 20-45s after steer if no reaction/progress
idle steer delivery: trigger turn if the steer is still fresh and goal-active
```

Risk triggers are not churn verdicts. They are “this period deserves monitor attention sooner” signals.

Candidate triggers:

- **Administrative loop signal**: repeated assistant turns with no tools, repeated `get_goal`, repeated “I should verify/continue” text, no progress event.
- **Repeated error fingerprint**: same tool or command failure appears twice with similar normalized stderr/exit code.
- **Exact-edit friction**: multiple `edit` misses on same file/range, especially without successful read/adaptation.
- **Scope-shift signal**: tool paths move outside objective/recent diff/workflow scope after a clear active phase.
- **Validation tunnel signal**: same broad gate repeats without a narrower failure hypothesis.
- **User correction signal**: user says the worker is off-course, a timer wake is stale, a queue action was wrong, etc.
- **Phase transition signal**: implementation→validation, validation→closeout, goal→queued goal handoff.
- **Long-running external worker signal**: Solo/timer process state changes, idle completion, stale timer duplicates.

Signals should feed a `MonitorReportTrigger` record with reasons and evidence; the monitor agent still chooses `watch`, `steer`, or `escalate`.

### Component 5 — token-aware report builder

Current reports include recent branch entries and recent churn logs. The prototype should add a tiered budgeter:

| Tier | Contents | Use |
|---|---|---|
| L0 counters | goal id/status, elapsed, telemetry counters, branch count, last progress time | Always included. |
| L1 semantic events | normalized observation events since previous report, fingerprints, phase markers | Default report body. |
| L2 targeted excerpts | short snippets around trigger events, failed tool summaries, user correction text | Included only when a risk trigger needs evidence. |
| L3 raw transcript slices | bounded recent entries | Fallback/debug only, capped. |
| L4 prior monitor log | last N compact decisions, default 10 | Always bounded; can be summarized if token budget tight. |

Token-efficiency tactics:

- Store compact observation events at runtime so reports do not resummarize raw transcript every time.
- Hash/fingerprint repeated errors and repeated status-only texts.
- Include deltas since the previous report rather than the same recent entries unless the monitor asks for continuity.
- Use stable phase labels (`setup`, `implementation`, `validation`, `closeout`, `queue_handoff`, `external_worker_wait`) to compress context.
- Apply a hard per-report token budget, e.g. 2k-4k tokens, with priority ordering.
- Persist report envelopes separately from model prompts so offline analytics can audit what was omitted.
- Keep the monitor log bounded, but allow roll-up summaries after every N log entries.

### Component 6 — monitor broker and process-latency reduction

Current monitor invocation is a full `pi --print` subprocess per report. That is simple and robust but adds startup and model latency.

Prototype options:

1. **Keep subprocess, improve scheduling/reporting first**
   - Lowest implementation risk.
   - Good Phase 1/2 target.
2. **Persistent monitor process**
   - Maintain one headless monitor session/process per active goal.
   - Send report messages through an RPC/process channel instead of spawning `pi` every cycle.
   - Reduces cold-start latency but adds lifecycle complexity.
3. **Hybrid broker**
   - Subprocess for low-frequency heartbeats.
   - Persistent broker only for active high-risk periods after the first risk trigger.

Recommended prototype path: start with option 1, instrument process latency, then evaluate option 3. Do not add persistent-process complexity before the analyzer proves process startup is a dominant latency.

### Component 7 — freshness validator and stale steer guards

The existing stale guard checks goal id and status. That is necessary but insufficient.

Add report/steer freshness metadata:

- `reportId`
- `goalId`
- `builtAt`
- `decisionAt`
- `validUntil`
- `observedThroughEntryId`
- `observedThroughBranchCount`
- `goalUpdatedAtAtReport`
- `telemetryUpdatedAtAtReport`
- `phaseAtReport`
- `triggerEventIds`

Before injecting a steer:

1. Re-read current goal.
2. Check goal id/status.
3. Check that no newer monitor report for the same goal has produced a decision.
4. Check that `Date.now() <= validUntil`.
5. Check that branch/session has not advanced through a known invalidating event:
   - user correction after report;
   - goal replacement/completion/pause/budget limit;
   - queue item changed;
   - phase transition that satisfies the steer’s requested action;
   - external state changed, if the steer targets Solo/timers.
6. If stale, persist decision as `steerInjected: false` with `staleReason`.

Before including a monitor steer in LLM context:

- Extend `classifyStatusGoalSteering()` so `pi-goal-monitor-steer` requires not only active goal/status but also freshness:
  - same `goalId`;
  - `details.kind === "monitorSteer"`;
  - `details.reportId` is latest non-stale steer for the goal;
  - `createdAt` within max age;
  - optional observed branch constraints still valid.

### Component 8 — delivery policy

Current monitor steering uses:

```ts
pi.sendMessage(..., { deliverAs: "steer" })
```

Recommended policy:

| Worker state | Fresh steer behavior |
|---|---|
| Agent streaming / tools active | `deliverAs: "steer"`, no `triggerTurn`; let Pi inject after current tool-safe boundary. |
| Agent idle, no pending messages | `deliverAs: "steer"`, `triggerTurn: true`, if the steer is high-confidence and still fresh. |
| Agent idle, pending queue/continuation/budget message | Do not blindly append; either merge freshness into next context or trigger a fresh report. |
| Steer older than max age | Do not deliver; persist stale decision. |
| Same goal but phase already advanced | Do not deliver; persist `staleReason: "phase_advanced"`. |

This directly reduces “session entry exists but worker never read it” latency.

### Component 9 — reaction tracking

After injecting a steer, record whether the worker followed it.

Heuristics for classification:

- `followed`: next assistant/tool action matches requested concrete action or stops named bad behavior.
- `ignored`: next one or two turns continue the named bad behavior with no acknowledgement.
- `superseded`: user provides newer instruction, goal completes, or queue/phase changes before reaction.
- `explicitly_rejected`: assistant says stale/no longer relevant or user says ignore it.
- `stale_ignored`: freshness validator or context filter drops it.
- `unclear`: insufficient evidence.

This is analytics only; it should not automatically punish the worker. It gives future monitor prompts evidence such as “previous steer ignored for 80s” without resending broad context.

## Implementation plan

### Phase 0 — offline analyzer, no runtime changes

Deliverables:

- Add a small project script or development utility, e.g. `.ai/scripts/monitor-latency-analyze.mjs` or a documented one-off tool under `.ai/tools/`.
- Parse session JSONL branch entries.
- Extract:
  - `pi-goal-monitor-log` custom entries;
  - `pi-goal-monitor-steer` custom messages;
  - nearby assistant/tool/user reactions;
  - explicit stale/ignored language.
- Emit Markdown or TOON summary:
  - action counts;
  - per-steer timeline;
  - latency metrics;
  - stale candidates.

Validation:

- Fixture with at least one watch, one steer, one stale/ignored example.
- Compare output to known transcript examples listed in this report.

### Phase 1 — runtime observability ledger

Deliverables:

- Add monitor-observation module, e.g. `.pi/extensions/goal/monitor-observations.ts`.
- Append compact `custom` entries for important events, or persist them as part of monitor-log state:
  - report built;
  - decision parsed;
  - steer considered/injected/stale;
  - reaction classified.
- Add named constants for observation limits and max steer age.

Validation:

- Deterministic probe that simulates reports/steers and verifies ledger replay.
- `npm run quality:goal`.

### Phase 2 — freshness guard for monitor steer

Deliverables:

- Extend monitor steer details with freshness metadata.
- Reject stale steers before injection when possible.
- Filter stale monitor steer messages from context when already appended.
- Keep existing goal id/status guard.

Validation:

- Probe: same goal, active, but stale `reportId` is ignored.
- Probe: same goal, active, but steer older than max age is ignored.
- Probe: latest fresh monitor steer remains in context.
- Live probe if runtime delivery/context behavior changes.

### Phase 3 — adaptive scheduler behind a feature flag

Deliverables:

- Introduce `GOAL_MONITOR_SCHEDULER_MODE = "fixed" | "adaptive"` or equivalent config seam.
- Keep fixed mode as default initially.
- Add event-risk triggers that schedule earlier reports with debounce.
- Ensure deterministic triggers do not decide churn; they only request monitor review.

Validation:

- Probe: repeated status-only/no-tool turns trigger an earlier report.
- Probe: ordinary productive tool progress does not spam reports.
- Probe: report intervals remain bounded by min debounce and max heartbeat.
- Probe: monitor still receives reports from goal start.

### Phase 4 — token-aware report builder

Deliverables:

- Add report tiers and a per-report token/character budget.
- Prefer semantic observations and deltas over raw recent branch entries.
- Preserve fallback recent branch excerpts for diagnostics.
- Persist report envelope metadata so omissions are auditable.

Validation:

- Probe: report stays under configured size.
- Probe: trigger evidence is included even under tight budget.
- Probe: duplicate events are fingerprinted/summarized.

### Phase 5 — delivery and reaction improvements

Deliverables:

- If high-confidence steer arrives while idle and fresh, call `pi.sendMessage(..., { deliverAs: "steer", triggerTurn: true })` or equivalent policy.
- Track first assistant/tool/progress event after steer.
- Persist reaction classification.

Validation:

- Probe: idle fresh steer starts a turn.
- Probe: streaming steer still waits for safe injection boundary.
- Probe: stale steer does not trigger a turn.
- Live probe required because this affects real agent-loop behavior.

### Phase 6 — optional persistent/hybrid monitor broker

Only pursue after phases 0-5 quantify process latency as material.

Deliverables:

- Prototype persistent monitor session/process or hybrid broker.
- Keep fallback subprocess path.
- Add shutdown/reload cleanup.

Validation:

- Stress test process lifecycle across goal pause/resume/clear/reload.
- Ensure no orphan monitor processes.
- Live probe required.

## Suggested issue split

1. **ISSUE-A — Monitor latency transcript analyzer**
   - Offline analysis only.
   - Low risk, high evidence value.
2. **ISSUE-B — Freshness metadata and stale monitor steer rejection**
   - Directly addresses late/stale steering.
   - Runtime behavior change.
3. **ISSUE-C — Adaptive monitor scheduler prototype**
   - Event-triggered reports behind flag.
   - Must preserve agentic monitor-judgment invariant.
4. **ISSUE-D — Token-aware monitor report tiers**
   - Report compression and envelope audit.
5. **ISSUE-E — Steer delivery/reaction tracking**
   - Idle trigger policy and post-steer analytics.
6. **ISSUE-F — Persistent monitor broker evaluation**
   - Optional, only if measured process latency justifies complexity.

## Acceptance criteria for the prototype

- The analyzer can reconstruct a per-goal monitor timeline from session JSONL.
- The analyzer distinguishes `pi-goal-monitor-steer` from `pi-goal-continuation`.
- The analyzer reports at least:
  - action counts;
  - per-steer report id / goal id / timestamps;
  - reaction classification;
  - stale/no-longer-applicable candidates.
- Runtime monitor logs include freshness metadata sufficient to reject old steers.
- Same-goal-but-old-report steers can be rejected, not only mismatched-goal/status steers.
- Adaptive scheduling can trigger earlier monitor review from event signals without local churn verdicts.
- Reports are bounded by a named token/character budget and include trigger evidence preferentially.
- Idle fresh monitor steer can actually reach the model promptly when appropriate.
- Deterministic probes cover parser, freshness, adaptive trigger, report budget, and delivery policy.
- `npm run quality:goal` passes after implementation.
- Live probe is run for delivery/context/scheduler behavior changes unless explicitly skipped with rationale.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Reintroducing deterministic churn gating | Triggers only schedule reports. Monitor agent still decides action. Tests should assert no local code maps risk signal directly to steer. |
| Monitor becomes too noisy | Debounce triggers, max reports per window, bounded heartbeat, post-steer cooldown unless new evidence. |
| Token bloat | Tiered report builder, fingerprint duplicate events, hard report cap, envelope audit. |
| Stale steer over-filtering | Keep reasoned stale logs; only reject on explicit freshness constraints. |
| Idle trigger creates unwanted auto loops | Only trigger high-confidence fresh steers; respect pending messages; safety caps remain. |
| Persistent broker complexity | Defer until metrics prove subprocess latency matters. |
| Transcript analyzer misreads branches/replays | Branch-aware traversal; label cross-branch records; deduplicate by report id/decision id. |

## Recommended next concrete step

Start with **ISSUE-A: Monitor latency transcript analyzer** plus **ISSUE-B: Freshness metadata and stale monitor steer rejection**.

Rationale:

- The transcript analyzer gives durable evidence and prevents future conflation of continuation steering and monitor steering.
- Freshness metadata directly addresses the known stale/late monitor-steering issue.
- Both are prerequisites for safely tuning scheduler cadence.
- Adaptive scheduling without good metrics would risk moving from “fixed sparse delay” to “smart-looking noise.”

## Completion audit checklist for this report

| Requirement from active goal | Evidence in this report |
|---|---|
| Design prototype system for capturing monitor semantics | Sections: architecture, branch-aware analyzer, normalized ledger. |
| Analyze steering latency from Pi session transcripts or pi-goals surface | Sections: transcript evidence, latency metrics, problem statement. |
| Systematically reduce latency beyond sparse fixed interval scanning | Sections: adaptive scheduler, delivery policy, freshness validator. |
| More intelligent than current sparse scanning | Event-risk triggers, phase changes, user corrections, post-steer follow-up. |
| Token-efficiency aware | Tiered token-aware report builder and token metrics. |
| Comprehensive technical report | Full design, data model, phases, risks, acceptance criteria. |
| Clear implementation plan | Phase 0-6 plan and suggested issue split. |
| Web research instruction | No web research performed; local project evidence was sufficient. Conditional instruction recorded for future external research. |
