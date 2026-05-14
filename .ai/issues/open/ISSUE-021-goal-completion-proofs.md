# ISSUE-021 — Durable/auditable goal completion proofs

Status: open — execution-ready for first proof-gate implementation pass
Priority: P1
Owner: pi-goal automation
Created: 2026-05-08
Updated: 2026-05-10
Next best session: focused implementation/validation pass for durable completion proof gates
Next best session rationale: The design choices are now locked for a first release: proof gates live on `GoalState`, the extension runtime executes bounded required proof commands, and completion is blocked when required proofs are missing, stale, or failed. Recent floor-gate and queue-continuation bugs show this is high leverage for preventing false-green goal completion.
Target bucket: open
Issue kind: feature
Target repo roots: `~/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on:
- `.ai/issues/fixed/ISSUE-036-minimum-goal-spend-floors.md`
Related:
- `.ai/issues/open/ISSUE-015-goal-subgoals.md`
- `.ai/issues/open/ISSUE-022-goal-history-checkpoints-and-compaction.md`
- `.ai/issues/open/ISSUE-023-goal-dependency-triggers-and-watchers.md`
- `.ai/issues/open/ISSUE-024-goal-audit-command.md`
- `.ai/issues/open/ISSUE-037-goal-queue-auto-continuation-after-complete.md`
- `.ai/docs/pi-goals-live-probe-testing.md`

## Goal

Add durable/auditable proof gates for `pi-goals`: explicit proof commands and pass conditions that must have fresh passing results before a goal can be marked complete.

Proof gates complement, but do not replace, the qualitative completion audit. The agent still needs to verify that the objective is actually satisfied; proof gates provide runtime-enforced evidence for requirements that can be checked by bounded commands.

## Problem/context

Current completion is still ultimately a model action through `update_goal(status:"complete")`. The continuation prompt asks for a completion audit, and ISSUE-036 added hard completion floors, but there is no way to attach durable command-based proofs such as:

```text
npm run quality:goal exits 0
node .ai/validation/specific-probe.mjs exits 0 and prints PASS
```

Recent issues raise the priority:

- ISSUE-036 showed hard completion gates can be added safely through a shared completion decision module.
- ISSUE-037 documented a live queue-continuation false-green/stop failure after a goal was marked complete while queued work remained.

Some goals need explicit proof gates that make false-green completion difficult even when the model is overconfident, distracted, or missing context.

## Transcript artifacts

- Request intake: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/06-final-audit.md`
- Dataflow and seams: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/07-dataflow-and-seams.md`
- Proof schema sketch: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/08-proof-schema-sketch.md`
- Execution plan: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/09-execution-plan.md`
- Executor review checklist: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/10-executor-review-checklist.md`
- Proof condition matrix: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/11-proof-condition-matrix.md`
- Validation expansion: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/12-validation-expansion.md`
- Runner safety research: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/13-runner-safety-research.md`
- BCU/ChatGPT external research attempt: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/14-bcu-external-research-attempt.md`
- Adversarial review: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/15-adversarial-review.md`
- Acceptance traceability matrix: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/16-acceptance-traceability-matrix.md`
- Closeout snapshot: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/17-closeout-snapshot.md`
- Tool API design: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/18-tool-api-design.md`
- Validation probe design: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/19-validation-probe-design.md`
- Proof UI/rendering plan: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/20-proof-ui-rendering-plan.md`
- Pure proof evaluator API: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/21-proof-evaluator-api.md`
- README update plan: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/22-readme-update-plan.md`
- Worktree freshness design: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/23-worktree-freshness-design.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/raw/commands.log`
- Validation probe log: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/raw/validation-expansion-probe.log`
- Path existence audit log: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/raw/path-existence-audit.log`
- Diff check log: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/raw/diff-check.log`
- Final status log: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/raw/status-final.log`
- Final check-ignore log: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/raw/check-ignore-final.log`
- Artifact inventory: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/raw/artifact-line-counts.log`
- Final open/refine inventories: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/raw/open-inventory-final.log`, `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/raw/refine-inventory-final.log`
- Quality gate log: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/raw/quality-goal-open-promotion.log`
- Promotion invariant probe: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/raw/promotion-invariant-probe.log`
- Open-bucket promotion: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/24-open-bucket-promotion.md`
- Migration consistency audit: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/25-migration-consistency-audit.md`
- Current code readiness audit: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/26-current-code-readiness-audit.md`
- Downstream reference update: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/27-downstream-reference-update.md`
- Promotion dependency map: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/28-promotion-dependency-map.md`
- Required proof command sanity: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/29-required-proof-command-sanity.md`
- Executor handoff: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/30-executor-handoff.md`
- Package script proof check: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/31-package-script-proof-check.md`
- Non-implementation boundary: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/32-non-implementation-boundary.md`
- Queue continuation note: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/33-queue-continuation-note.md`
- Closeout summary: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/34-closeout-summary.md`
- Floor gate source recheck: `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/35-floor-gate-source-recheck.md`

## Desired behavior

Users/agents can configure required proof gates on a goal. A proof gate includes at minimum:

- stable proof id;
- trusted requirement source/reference;
- shell command string;
- cwd policy;
- timeout milliseconds;
- output cap;
- condition type and expected value when applicable;
- freshness policy;
- required/optional flag, with first release focused on required gates.

Before `update_goal(status:"complete")` succeeds:

- every required gate must have a fresh passing proof result;
- missing, stale, timed-out, or failed required proofs block completion;
- the tool response explains which proof blocked completion and how to rerun/fix it;
- proof execution/result state is durable in the Pi branch and visible through tools/UI summaries;
- maximum budgets still win over proof execution: budget-limited wrap-up must not force new proof runs past a max budget cap.

## Grounded research findings

### Code surfaces inspected

- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/state.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/completion-gate.ts`
- `.pi/extensions/goal/prompts.ts`
- `.pi/extensions/goal/monitor-prompts.ts`
- `.pi/extensions/goal/templates.ts`
- `.pi/extensions/goal/command.ts`
- `.pi/extensions/goal/tool-results.ts`
- `.pi/extensions/goal/monitor-report.ts`
- `.pi/extensions/goal/monitor.ts`
- `.pi/extensions/goal/constants.ts`
- `.pi/extensions/goal/model-output.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/telemetry.ts`
- `.pi/extensions/goal/queue-tools.ts`
- `.pi/extensions/goal/budget.ts`
- `.pi/extensions/goal/format.ts`
- `.pi/extensions/goal/widget.ts`
- `.pi/extensions/goal/ui.ts`
- `.ai/issues/fixed/ISSUE-010-goal-update-telemetry-completion-semantics.md`
- `.ai/issues/fixed/ISSUE-020-goal-churn-monitor.md`
- `.ai/issues/fixed/ISSUE-036-minimum-goal-spend-floors.md`
- `.ai/issues/open/ISSUE-037-goal-queue-auto-continuation-after-complete.md`
- `.ai/issues/open/ISSUE-015-goal-subgoals.md`
- `.ai/issues/open/ISSUE-022-goal-history-checkpoints-and-compaction.md`
- `.ai/issues/open/ISSUE-023-goal-dependency-triggers-and-watchers.md`
- `.ai/issues/open/ISSUE-024-goal-audit-command.md`

### Current behavior facts

- `GoalState` has no proof gate or proof result fields today.
- `state.ts` persists branch-replayable `pi-goal-state` custom entries. Optional proof fields can be added backward-compatibly if parsing remains defensive.
- `tools.ts` owns the model-tool completion path and currently calls `decideGoalCompletion(...)` before non-active status side effects.
- `completion-gate.ts` is the right first integration point for proof-gate decisions because ISSUE-036 already established it as the shared completion decision module.
- `prompts.ts` asks the model to run a completion audit, but this is not durable or runtime-enforced.
- `templates.ts` supports inline commands during template resolution when `allow_commands: true`; that is not a safe substitute for completion proof execution because proof gates must be explicit, bounded, auditable, and tied to goal state.
- `tool-results.ts` centralizes model-visible details for goal tools. Proof-blocked completion should add structured result metadata analogous to `completion_blocked_by_floor`.
- `monitor-report.ts` includes floor state in sparse monitor reports. Compact proof state can be included later for monitor awareness, but deterministic proof pass/fail must not depend on monitor judgment.
- `monitor.ts` demonstrates bounded `pi.exec` use with named timeout/output constants and stale-guarded decisions. Proof execution should copy the bounded/stale-guard posture without copying monitor-as-judge semantics.
- `templates.ts` demonstrates bounded `/bin/bash -lc` inline command execution behind explicit `allow_commands`; this is precedent for bounded command execution, but template inline commands are not durable completion proofs.
- `monitor-prompts.ts` can detect false-green/churn behavior but does not own proof execution.
- ISSUE-024 confirms `/goal audit` should remain a qualitative review surface that can consume proof state later; it should not be bundled with the first proof-gate implementation.
- ISSUE-015/022/023 show future coordination points for subgoal-level proof gates, checkpoint summaries of proof results, and bounded command-runner reuse with watchers; none should block first-release top-level completion proof gates.
- ISSUE-010 confirms completion telemetry must be based on actual successful tool results, not attempted status updates; proof-gate telemetry should follow the same principle.
- `lifecycle.ts` marks completion from returned `details.goal.status === "complete"`; proof-blocked completion must return the current active goal in details, never a candidate complete goal.
- `state.ts:persistAccountGoal` updates `goal.updatedAt` on accounting-only turns, so proof freshness must use content/config fingerprints instead of raw `updatedAt`.
- Pi `exec` supports timeout/cwd and returns `killed`, but has no typed output-cap option; proof runner must cap output before persistence.
- `command.ts` has no `/goal proof` surface; first release should use model tools and defer slash-command proof UX.
- `queue-tools.ts` queue metadata does not carry arbitrary proof payloads; first release should configure proof gates after a concrete queued/template goal starts.
- `format.ts`, `widget.ts`, and `ui.ts` show proof rendering must be compact to avoid crowding the existing card/status surfaces.
- A BCU/Safari ChatGPT research pass was attempted but blocked by BCU targeting/timeouts before a new chat could be started; no external claims were incorporated.
- After open-bucket promotion, `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/26-current-code-readiness-audit.md` rechecked `completion-gate.ts`, `tools.ts`, `tool-results.ts`, `state.ts`, `lifecycle.ts`, and `continuation.ts`; the live code still matches the planned proof-gate insertion seams.

## Locked design choices

### Proof storage

Chosen: store effective proof gates and proof results on `GoalState` or adjacent replayed goal state, not only in prompt docs.

Rationale: `GoalState` is the completion gate source of truth and is replayed through `/tree`. Prompt templates may populate proof gates later, but completion must evaluate the persisted effective gates.

Rejected:

- Prompt-doc-only proofs: not reliable after goal creation/replay and not the runtime source of truth.
- External issue-doc-only proofs: useful as planning, but not enforceable by the extension.

### Proof execution owner

Chosen first release: extension runtime executes explicitly configured proof commands through bounded `pi.exec`/tool-owned runner semantics.

Rationale: model-manual command execution is not durable enough. The completion gate needs structured proof result records with exit code, timeout, output cap, and condition evaluation.

Rejected for first release:

- Arbitrary model-attested proof claims.
- Long-running external verifier service.

### Condition DSL

Chosen first release condition types:

- `exit_zero`
- `stdout_contains`
- `stderr_contains`
- `output_contains`
- optional `stdout_regex` only if bounded and implemented with plain JavaScript RegExp construction, no eval-like DSL.

Rejected:

- Arbitrary JavaScript/eval conditions.
- Full JSONPath/JQ DSL in first pass.

### Freshness policy

Chosen first release:

- Proof result records gate config hash, a goal content/proof-config fingerprint, cwd, started/completed timestamps, exit code, timeout flag, and bounded output excerpt.
- A proof is stale if the gate definition changes or if the goal objective/proof configuration changes after the proof result.
- Do **not** use raw `goal.updatedAt` as the freshness key: `state.ts:persistAccountGoal` updates `updatedAt` on every turn for token/time accounting, and accounting alone must not stale proof results.
- Add a `freshness` mode with at least `goal_state` and `worktree_status`. For `worktree_status`, follow `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/23-worktree-freshness-design.md`: capture the post-proof `git status --short --untracked-files=all` fingerprint for the resolved cwd and require it to match before completion.

### Override policy

Chosen first release: no model force-complete override for failed required proofs. Users can remove or edit proof gates explicitly, and those edits are auditable state changes.

## Implementation checklist

- Add proof domain types to `types.ts`, such as `GoalProofGate`, `GoalProofResult`, `ProofCondition`, and `ProofFreshnessPolicy`.
- Use `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/08-proof-schema-sketch.md` as the starting schema sketch, adjusting only when implementation evidence requires it.
- Follow the completion dataflow/seam notes in `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/07-dataflow-and-seams.md` for insertion order and side-effect boundaries.
- Add optional proof fields to goal state and defensive replay parsing in `state.ts`; trim proof results before persistence so full goal snapshots do not duplicate unbounded proof history.
- Add pure proof evaluation module, e.g. `.pi/extensions/goal/proofs.ts`, for condition and freshness decisions; use `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/21-proof-evaluator-api.md` as the target API sketch.
- Add bounded proof runner module, e.g. `.pi/extensions/goal/proof-runner.ts`, wrapping `pi.exec` with timeout/output caps.
- Add model tools for proof management in a dedicated `proof-tools.ts` module wired from `tools.ts`, mirroring `queue-tools.ts` instead of growing `tools.ts` directly:
  - add/update/remove proof gates;
  - run proof gate(s);
  - inspect proof results.
- Extend `tool-results.ts` with proof-blocked completion details and compact latest proof summaries.
- Integrate proof gate decisions into `completion-gate.ts` so required missing/stale/failed proofs defer completion before persistence/cancellation.
- Update model tool guidelines for `update_goal` and proof tools so agents know required proofs must be fresh before completion and must not remove/replace gates merely to complete faster.
- Render proof state in `format.ts`, `widget.ts`, and/or `ui.ts` according to `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/20-proof-ui-rendering-plan.md`, favoring detailed `get_goal`/summary output and compact widget/footer hints.
- Add template/frontmatter support only after runtime proof gates are stable, or explicitly defer it.
- Add deterministic probes and live probe, following `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/19-validation-probe-design.md` for probe shape.
- Follow the phased execution plan in `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/09-execution-plan.md` when running through Solo/TLO.
- Use `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/10-executor-review-checklist.md` as the pre-close implementation checklist.
- Update README using `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/22-readme-update-plan.md`, including a new proof-gates section after completion floors.

## Acceptance criteria

- A goal can store required proof gates durably and replay them through session tree replay.
- A proof runner can execute bounded non-interactive commands and persist structured results.
- `update_goal(status:"complete")` is deferred when any required proof is missing, stale, timed out, or failed.
- Completion succeeds when all required proofs are fresh and passing and other gates also allow completion.
- Proof results include enough evidence for audit without unbounded output growth.
- Proof gate edits are explicit and auditable.
- No arbitrary proof command from an untrusted prompt doc is executed without being part of explicit goal proof configuration.
- Existing floor/budget/queue behavior remains green.
- Acceptance-to-proof traceability is recorded in `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/16-acceptance-traceability-matrix.md`.

## Proof threat model

Primary invariant: a goal with required proof gates cannot be marked complete unless every required proof has a fresh passing result matching the current gate definition and freshness policy.

False-green risks:

- Model says tests passed but no durable result exists.
- Old passing result is reused after files or goal/proof config changed.
- Output contains a success string while command exits non-zero and the wrong condition accepts it.
- Proof command hangs or prompts interactively.
- Proof command runs arbitrary shell text imported from an untrusted prompt instead of explicit trusted proof configuration.
- Output cap hides the useful failure context.
- Prompt template inline command execution is mistaken for proof execution.
- Completion gate order allows monitor/continuation cancellation before proof deferral.
- Contains/regex proof conditions accidentally ignore non-zero exits and pass on misleading output.
- Proof results grow unbounded or stale too aggressively on mere usage accounting.
- The model configures a weak proof gate to satisfy itself; proof gates are only authoritative when obligations come from trusted user/objective/issue-doc requirements and proof edits/removals are auditable.

## Required proofs

```toon
toon.version: 1
required_proofs[6]{name,source,command,pass_condition,scope,notes}:
  proof_gate_decision_probe,"issue doc","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-proof-gate-decision-probe.mjs","exit 0; missing, failed, stale, and passing proof cases are asserted",run,"must fail if completion can bypass required proof gates"
  proof_runner_probe,"issue doc","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-proof-runner-probe.mjs","exit 0; exit_zero, contains, timeout, and output-cap behavior asserted",run,"validates bounded runner semantics"
  replay_probe,"issue doc","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-proof-replay-probe.mjs","exit 0; proof gates/results survive replay; goal/proof config changes stale results; token/time accounting alone does not stale",run,"guards branch replay compatibility and freshness precision"
  floor_budget_regression,"issue doc","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-min-spend-floors-probe.mjs && npm run quality:goal","exit 0",run,"ensures proof gates do not break existing completion floors or required quality gate"
  live_probe,"issue doc","Use .ai/docs/pi-goals-live-probe-testing.md to create a disposable proof-gated goal, fail completion before proof pass, run/pass proof, complete goal, and cleanup","transcript shows failed proof blocks completion and fresh passing proof allows completion",live,"needed because completion-gate behavior is live runtime behavior"
  slop_guard,"AGENTS.md","cd ~/dev/personal/experiments/pi-goals && npm run slop:goal","exit 0",run,"no TypeScript escape-hatch casts under .pi/extensions/goal"
```

## TOON synthesis

```toon
toon.version: 1
issue{id,status,kind,goal}:
  "ISSUE-021","open — execution-ready","feature","durable required proof gates before goal completion"

locked_requirements[5]{id,requirement}:
  "lr1","proof gates persist on effective goal state"
  "lr2","extension runtime executes bounded required proof commands"
  "lr3","completion gate blocks missing stale failed or timed-out required proofs"
  "lr4","proof results are replayable and auditable with bounded output"
  "lr5","user edits remove or change gates explicitly; model cannot force-complete failed gates"

implementation_surfaces[6]{id,path,reason}:
  "s1",".pi/extensions/goal/types.ts","proof gate/result domain types"
  "s2",".pi/extensions/goal/state.ts","replay-compatible persisted proof fields"
  "s3",".pi/extensions/goal/completion-gate.ts","completion blocking decision integration"
  "s4",".pi/extensions/goal/proof-tools.ts wired from .pi/extensions/goal/tools.ts","proof management and proof-run tools without growing tools.ts directly"
  "s5",".pi/extensions/goal/proofs.ts","pure proof condition/freshness evaluation"
  "s6",".pi/extensions/goal/proof-runner.ts","bounded pi.exec proof execution"

condition_matrix[4]{condition,pass_rule,notes}:
  "exit_zero","exit code is 0","default first-pass condition"
  "stdout_contains","exit code is 0 by default and stdout includes configured string","string match only; explicit config may opt out of exit-zero requirement"
  "stderr_contains","exit code is 0 by default and stderr includes configured string","rare but useful for tools that report to stderr"
  "output_contains","exit code is 0 by default and stdout or stderr includes configured string","must still record exit code"

freshness_modes[2]{mode,stale_when}:
  "goal_state","goal objective or proof config fingerprint changed after proof result; token/time accounting alone does not stale"
  "worktree_status","goal_state stale or current git status fingerprint differs from post-proof fingerprint captured for resolved cwd"

verification_checks[4]{id,check,evidence}:
  "v1","missing required proof blocks completion","deterministic probe"
  "v2","fresh passing proof allows completion","deterministic and live probes"
  "v3","stale proof result blocks completion after goal/proof/worktree change","replay/freshness probe"
  "v4","proof command timeout/output cap is enforced","proof runner probe"
```

## Deferred work

- Full CI/CD integration.
- Cryptographic attestation.
- Arbitrary JSONPath/JQ/custom condition DSL.
- Prompt-template proof frontmatter auto-execution without explicit confirmation.
- Subgoal-level proof gates before ISSUE-015's first nested-child implementation lands.
- Automatic checkpoint generation for proof results before ISSUE-022 is refined.
- Watcher/dependency-trigger integration before ISSUE-023 is refined.
- Multi-agent/external verifier service.
