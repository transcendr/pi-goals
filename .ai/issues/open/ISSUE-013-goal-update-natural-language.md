# ISSUE-013 — `/goal update` natural-language goal updates

Status: open — execution-ready for deterministic parser/confirmation implementation
Priority: P2
Owner: pi-goal automation
Created: 2026-05-08
Updated: 2026-05-10
Next best session: implement deterministic `/goal update` parser, proposal confirmation, and validation probes
Next best session rationale: Parser strategy, trust boundary, confirmation UX, completion restriction, objective edit semantics, literal syntax, and progress dependency are now locked.
Target bucket: open
Issue kind: feature
Target repo roots: `~/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on:
- `.ai/issues/fixed/ISSUE-010-goal-update-telemetry-completion-semantics.md`
Related:
- `.ai/issues/open/ISSUE-014-goal-progress-estimates.md`
- `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`
- `.ai/issues/open/ISSUE-024-goal-audit-command.md`
- `.ai/docs/pi-goals-live-probe-testing.md`

## Goal

Add a user-facing `/goal update <request>` command that lets users revise the current goal through bounded natural-language-like prose without direct tool JSON and without accidentally replacing the whole goal.

The first implementation must be deterministic, confirmation-gated, and aligned with the existing structured `update_goal` tool semantics.

## Problem/context

Current command support covers:

- `/goal` summary;
- `/goal <objective>` create/replace/queue prompt;
- `/goal pause`;
- `/goal resume`;
- `/goal clear`;
- `/goal queue ...`.

There is no `/goal update` command today. A user who types a non-control command gets objective/template handling. Natural-language field edits such as these currently rely on the agent choosing `update_goal` correctly:

```text
/goal update extend token budget to 5M
/goal update add a 10 minute time budget
/goal update change the objective to also include docs validation
/goal update remove the time budget
```

This creates two risks:

- Direct slash-command users do not have a safe field-update path.
- Adding `/goal update` naively could become a best-effort natural-language mutation engine that silently edits or completes goals from ambiguous prose.

## Transcript artifacts

- Request intake: `.ai/docs/issue-workflow/ISSUE-013-goal-update-natural-language/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-013-goal-update-natural-language/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-013-goal-update-natural-language/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-013-goal-update-natural-language/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-013-goal-update-natural-language/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-013-goal-update-natural-language/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-013-goal-update-natural-language/06-final-audit.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-013-goal-update-natural-language/raw/commands.log`
- Pre-refinement invariant probe: `.ai/docs/issue-workflow/ISSUE-013-goal-update-natural-language/raw/pre-refinement-nl-update-invariant-probe.log`
- Research grep log: `.ai/docs/issue-workflow/ISSUE-013-goal-update-natural-language/raw/research-rg.log`
- Sentrux planning sensor: `.ai/docs/issue-workflow/ISSUE-013-goal-update-natural-language/raw/sentrux-gate.log`
- Promotion invariant probe: `.ai/docs/issue-workflow/ISSUE-013-goal-update-natural-language/raw/promotion-invariant-probe.log`
- Quality gate log: `.ai/docs/issue-workflow/ISSUE-013-goal-update-natural-language/raw/quality-goal-open-promotion.log`
- Final visibility/path checks: `.ai/docs/issue-workflow/ISSUE-013-goal-update-natural-language/raw/final-visibility-and-path-checks.log`
- Final inventory: `.ai/docs/issue-workflow/ISSUE-013-goal-update-natural-language/raw/final-inventory.log`
- Final comprehensive completion probe: `.ai/docs/issue-workflow/ISSUE-013-goal-update-natural-language/raw/final-comprehensive-completion-probe.log`

## Grounded research findings

Source artifact: `.ai/docs/issue-workflow/ISSUE-013-goal-update-natural-language/02-grounded-research.md`.

Current facts:

- `.pi/extensions/goal/command.ts` registers `/goal` and has control subcommands `pause`, `resume`, `clear`, and `queue`; no `update` subcommand exists.
- Any non-empty `/goal <args>` that is not a control subcommand is treated as template/objective creation. `/goal update ...` must therefore be routed before objective creation.
- `/goal <objective>` with an active goal prompts `Replace`, `Queue`, or `Cancel`; this is new-goal/replacement UX, not field-edit UX.
- `.pi/extensions/goal/tools.ts` owns structured `update_goal` validation and mutation for `status`, `objective`, token/time budgets, and wrap-up floors.
- `update_goal(status:"complete")` uses the shared completion gate and can be deferred by hard completion floors.
- Completion telemetry was fixed by ISSUE-010 to count only actual successful complete tool results.
- ISSUE-014 adds advisory progress fields and `update_goal` progress params; progress must remain advisory and must not imply completion.
- ISSUE-021 plans proof gates; `/goal update` completion behavior must not bypass future proof gates.
- ISSUE-024 plans `/goal audit`; completion-readiness review belongs there, not in the first `/goal update` parser.
- `ctx.ui.select(...)` is already used for command confirmation choices in replacement/resume flows.
- Sentrux planning sensor was run: `sentrux gate --save .pi/extensions/goal` exited `0` and saved a baseline.

## Locked design choices

Source artifact: `.ai/docs/issue-workflow/ISSUE-013-goal-update-natural-language/03-design-lock.md`.

### Parser strategy

Chosen first release: **deterministic known-field parser only**.

Rejected:

- hidden model-assisted extraction;
- free-form model rewrite of objective text;
- best-effort partial parsing from ambiguous prose.

Rationale: slash-command state mutation must be predictable, auditable, prompt-injection resistant, and testable with deterministic negative cases.

### Trust boundary

- Parser consumes only the `/goal update` request string and current goal state required for preview.
- Current goal objective is never fed into a model parser.
- Parsed output is a structured proposed mutation.
- State changes apply only after explicit user confirmation.
- Application must reuse the same internal semantics as `update_goal` or a shared helper extracted from it.

### Confirmation UX

All successful parses require confirmation in the first release.

Prompt must show:

- goal id/status;
- proposed structured fields;
- clears as explicit clear/null actions;
- objective before/after excerpt for objective edits;
- parsed numeric value and human-readable rendering for budgets/floors;
- any likely budget-limited warning.

Choices:

- `Apply update`
- `Cancel`

No `--yes` or auto-apply path in the first pass.

### Completion restriction

`/goal update` must **not** support marking a goal complete in the first implementation pass.

Explicit completion phrases such as `mark complete`, `complete goal`, `mark done`, or `goal achieved` must refuse with guidance to perform an audit and let the structured `update_goal(status:"complete")` path enforce floors/proofs/telemetry.

### Objective edit vs replacement

Objective update grammar edits the current `GoalState.objective` and preserves:

- `goalId`;
- accounting;
- budgets;
- wrap-up floors;
- telemetry;
- queue/session context.

It is not equivalent to `/goal <new objective>` replacement and must not reset telemetry or schedule a `created` continuation.

### Literal syntax

Token literals:

- integers, `k`, and `m` suffixes using base-10 powers;
- examples: `5000`, `5k`, `250K`, `1m`, `5M`;
- result must be a positive safe integer for budgets/floors.

Duration literals:

- explicit units only: seconds, minutes, hours;
- examples: `30s`, `30 seconds`, `10m`, `10 minutes`, `1h`, `2 hours`;
- plain integer time values are rejected to avoid seconds/minutes ambiguity;
- result must be a positive safe integer number of seconds.

Progress literals after ISSUE-014 lands:

- integer `0%` through `100%` only;
- optional note follows ISSUE-014's note validation;
- `100%` remains advisory and status stays unchanged.

## Supported first-pass grammar

Implement only explicit forms that map to one structured mutation object.

- Token budget: `set/change/extend token budget to <tokens>`, `remove/clear token budget`.
- Time budget: `set/change time budget to <duration>`, `add time budget of <duration>`, `remove/clear time budget`.
- Token wrap-up floor: `set token floor to <tokens>`, `set min tokens before wrap-up to <tokens>`, `remove/clear token floor`.
- Time wrap-up floor: `set time floor to <duration>`, `set min time before wrap-up to <duration>`, `remove/clear time floor`.
- Objective: `set objective to <text>`, `change objective to <text>`, `replace objective with <text>`, `append to objective: <text>`.
- Progress after ISSUE-014 lands: `set progress to <0-100>%`, `set progress to <0-100>% note <text>`, `clear/remove progress`.
- Exact status aliases may be supported: `pause goal`, `resume goal`.

Ambiguous requests must refuse and leave state unchanged.

## Implementation checklist

- [ ] Add `update` to `GoalSubcommand` and autocomplete in `.pi/extensions/goal/command.ts`.
- [ ] Route `/goal update ...` before template/objective creation.
- [ ] Add a small deterministic parser/proposal module, e.g. `.pi/extensions/goal/update-command-parser.ts`.
- [ ] Add token/duration/progress literal parsing with deterministic errors.
- [ ] Add proposal formatting for confirmation prompts.
- [ ] Require `ctx.ui.select(...)` confirmation for every parsed proposal.
- [ ] Apply confirmed proposals through shared `update_goal` semantics; extract common update application from `tools.ts` if needed.
- [ ] Ensure cancel leaves branch state, UI, telemetry, continuation, and monitor scheduling unchanged.
- [ ] Refuse completion phrases with guidance instead of applying `status:"complete"`.
- [ ] Preserve `goalId` and telemetry for objective edits.
- [ ] Integrate progress grammar only through ISSUE-014 fields; do not create parallel progress state.
- [ ] Update README command docs and natural-language goal management docs.
- [ ] Add deterministic validation probes under `.ai/validation/` for parser, confirmation, completion refusal, literal validation, objective identity preservation, and progress semantics.
- [ ] Run `sentrux gate --save .pi/extensions/goal` before implementation and `npm run quality:goal` after implementation.
- [ ] Run or explicitly justify skipping live probe per `.ai/docs/pi-goals-live-probe-testing.md` because this changes slash-command behavior.

## Acceptance criteria

- `/goal update` is registered, autocompletes, and never creates/replaces a goal objective by accident.
- With no active goal, `/goal update ...` reports that no goal exists and does not create one.
- Supported update requests produce structured proposals and require explicit confirmation.
- `Cancel` leaves goal state and telemetry unchanged.
- `Apply update` uses the same validation and side-effect rules as `update_goal`.
- Ambiguous or unsupported prose refuses without mutation and shows concise supported grammar guidance.
- Token and duration literals parse exactly as specified; invalid/ambiguous values are rejected.
- Objective updates preserve `goalId`, usage accounting, budgets/floors, and telemetry.
- `/goal update mark complete` and equivalent completion phrases are refused in the first pass.
- Progress updates, if implemented after ISSUE-014, remain advisory and cannot mark complete or count as substantive progress-only work.
- README documents the supported grammar and completion restriction.
- `npm run quality:goal` passes.

## Proof threat model

Source artifact: `.ai/docs/issue-workflow/ISSUE-013-goal-update-natural-language/04-proof-threat-model.md`.

Primary invariant: a `/goal update <request>` command must never silently or ambiguously mutate goal state. It must parse only a bounded deterministic grammar, display a structured proposal, require confirmation, and apply the same update semantics as the trusted `update_goal` path.

High-risk false greens:

- parser accepts ambiguous prose;
- hidden model extraction allows prompt injection or non-determinism;
- confirmation is bypassed;
- completion phrases bypass proof/floor/tool gates;
- budget/time units are misread;
- objective edit resets goal identity or telemetry;
- progress reaches 100% and is treated as completion;
- command validation diverges from tool validation.

## TOON synthesis

```toon
toon.version: 1
issue{id,status,target_session,goal}:
  "ISSUE-013","execution-ready-first-pass","implement deterministic /goal update parser and confirmation","safe slash-command field updates for the active goal without accidental replacement or completion bypass"
locked_requirements[8]{id,requirement}:
  "lr1","/goal update is routed before objective/template creation and never creates/replaces a goal by accident"
  "lr2","parser is deterministic known-field grammar only; no hidden model-assisted extraction"
  "lr3","every parsed proposal requires explicit Apply update confirmation; Cancel is no-op"
  "lr4","confirmed proposals reuse update_goal validation/side-effect semantics"
  "lr5","completion phrases are refused in first pass and cannot call status complete"
  "lr6","objective edits preserve goalId, telemetry, budgets, floors, and accounting"
  "lr7","token and duration literals use explicit bounded syntax and reject ambiguity"
  "lr8","progress grammar, if enabled after ISSUE-014, remains advisory-only and cannot complete the goal"
implementation_surfaces[7]{id,path,change}:
  "s1",".pi/extensions/goal/command.ts","add update subcommand, autocomplete, no-goal handling, confirmation orchestration"
  "s2",".pi/extensions/goal/update-command-parser.ts","new deterministic parser/proposal/literal helpers"
  "s3",".pi/extensions/goal/tools.ts","extract or expose shared update application semantics without broadening tool API unsafely"
  "s4",".pi/extensions/goal/format.ts","add small proposal/literal formatting helpers only if cohesive"
  "s5","README.md","document /goal update grammar and completion restriction"
  "s6",".ai/validation/","add deterministic parser/command semantic probes"
  "s7",".pi/extensions/goal/*.test or validation harness","cover apply/cancel and no-mutation cases"
required_proofs[8]{id,command,pass_condition,evidence,notes}:
  "rp1","node .ai/validation/goal-update-parser-probe.mjs","exits 0 and prints PASS for accepted/refused grammar matrix","raw parser probe log","must include ambiguous prose and completion phrase negatives"
  "rp2","node .ai/validation/goal-update-confirmation-probe.mjs","exits 0 and prints PASS for Apply vs Cancel behavior","confirmation probe log","Cancel must leave state/telemetry unchanged"
  "rp3","node .ai/validation/goal-update-budget-literals-probe.mjs","exits 0 and prints PASS for token/duration parsing and rejection cases","literal probe log","plain integer time budget must be rejected"
  "rp4","node .ai/validation/goal-update-objective-identity-probe.mjs","exits 0 and prints PASS that objective edits preserve goalId/accounting/budgets/floors","identity probe log","must distinguish /goal replacement from /goal update objective edit"
  "rp5","node .ai/validation/goal-update-completion-refusal-probe.mjs","exits 0 and prints PASS that completion phrases do not call status complete","completion refusal log","must preserve exact completion-gate authority for update_goal"
  "rp6","node .ai/validation/goal-update-progress-advisory-probe.mjs","exits 0 and prints PASS if progress support is present, or SKIP with ISSUE-014-not-implemented reason","progress probe log","progress 100% must not mark complete"
  "rp7","npm run quality:goal","exits 0","quality gate log","includes Sentrux/check, TypeScript, slop guard, and Pi extension load validation"
  "rp8","git diff --check && git status --short --untracked-files=all","diff check exits 0 and status shows intended files only","final audit log","protects whitespace and unintended-file regressions"
validation_notes[5]{id,note}:
  "vn1","Live probe is recommended because slash-command behavior changes; skip only with explicit deterministic-coverage rationale."
  "vn2","No proof may depend on a model deciding whether parser output is acceptable."
  "vn3","Completion refusal must not alter floor/proof state or mark telemetry completed."
  "vn4","If shared update application is extracted from tools.ts, Sentrux degradation/rule failures must be fixed unless explicitly accepted."
  "vn5","Keep parser module small and table-driven to avoid command.ts becoming a god file."
```
