# 05 — Issue writeback

## Canonical issue doc written

- Path: `.ai/issues/open/ISSUE-036-minimum-goal-spend-floors.md`
- Status: `open — execution-ready`
- Priority: `P1`
- Target repo root: `~/dev/personal/experiments/pi-goals`
- Next best session: focused implementation/validation pass for minimum spend floors

## Writeback inputs used

The issue doc was written after these required transcript artifacts existed:

- `00-request.md`
- `01-protocol-read.md`
- `02-grounded-research.md`
- `03-design-lock.md`
- `04-proof-threat-model.md`
- `07-owner-feedback-followup.md`
- `08-bcu-chatgpt-research.md`
- `raw/commands.log`
- `raw/chatgpt-response-round1.txt`
- `raw/chatgpt-round2-grounded-prompt.txt`
- `raw/chatgpt-response-round2-grounded.txt`
- `raw/chatgpt-round3-execution-angle-prompt.txt`
- `raw/chatgpt-response-round3-execution-angle.txt`
- `raw/chatgpt-round3b-adversarial-followup-prompt.txt`
- `raw/chatgpt-response-round3b-adversarial-current-text.txt`

## Sections included in the issue doc

- [x] Title in `# ISSUE-036 — <title>` form.
- [x] Status, priority, owner, created date.
- [x] Next best session and rationale.
- [x] Target bucket and issue kind.
- [x] Target repo root.
- [x] Parent, depends on, and related references.
- [x] Goal.
- [x] Problem/context.
- [x] Transcript artifact links.
- [x] Desired behavior.
- [x] Grounded research findings linked to `02-grounded-research.md`.
- [x] Locked design choices linked to `03-design-lock.md`.
- [x] Rejected alternatives.
- [x] Implementation checklist.
- [x] Acceptance criteria.
- [x] Proof threat model linked to `04-proof-threat-model.md`.
- [x] TOON synthesis block.
- [x] Importable `required_proofs[]` TOON block.

## Locked planning truth written back

The issue doc records these design decisions as canonical:

1. Minimum goal spend floors are hard pre-wrap-up/completion gates, not display-only guidance.
2. The first release does not add a force-complete override.
3. Field names should avoid the existing max-budget/cap meaning:
   - `minTokensBeforeWrapUp`
   - `minTimeSecondsBeforeWrapUp`
   - `min_tokens_before_wrap_up`
   - `min_time_seconds_before_wrap_up`
4. All configured floors are conjunctive.
5. Floors must not exceed max budgets for the same resource when both are configured.
6. Existing maximum budget behavior remains authoritative.
7. Prompt/steering quality is a first-class requirement: floor-driven continuation must perform materially valuable work and avoid quota-filling churn.
8. Monitor, UI, queue, template, README, and live probe validation are in scope.

## Proof rows written back

The issue doc includes a `required_proofs[7]` TOON block with these proof names:

- `sentrux_baseline`
- `floor_gate_probe`
- `floor_steering_probe`
- `prompt_surface_probe`
- `quality_goal`
- `live_probe_min_floor`
- `artifact_closeout`

## Owner feedback follow-up

After initial writeback, the owner asked for the most important steering/monitor portions to be more concrete and autonomous. A follow-up artifact was added at `07-owner-feedback-followup.md`, and the issue/design/proof docs were updated to require:

- a shared `floor-steering` module/catalog;
- concrete pass ids and pass-selection algorithm;
- autonomous fallback ladder instead of asking the user for floor-unmet direction;
- floor-aware monitor report fields, pattern names, and watch/steer/escalate rules;
- deterministic `floor_steering_probe` proof plus strengthened live-probe pass conditions.

## BCU + ChatGPT research follow-up

The folded BCU research pass added `08-bcu-chatgpt-research.md` and raw ChatGPT evidence. The issue/design/proof docs were updated with Round 2 grounded findings:

- add a pure `.pi/extensions/goal/floor.ts` helper surface;
- run the completion gate after candidate validation but before completion side effects/state persistence;
- return a non-error-shaped completion deferral result with `completion_blocked_by_floor` and `next_floor_pass`;
- treat `noMoreValuableWorkReason` as a recorded outcome, not first-attempt model permission;
- add explicit floor telemetry mutation helpers;
- add narrow `objectiveAllowsUserFloorFallback` semantics;
- cover soft final-answer wrap-up without `update_goal(status:"complete")`;
- add monitor pattern `floor_quality_exhausted` and telemetry interaction.

A second folded BCU research pass (Round 3A/3B) reviewed execution risk from a maintainer/test-engineer perspective. The issue/design/proof docs were further updated to require:

- exact `tools.ts` gate insertion before cancellation/persistence/queue-complete side effects;
- same-call floor removal/lowering plus `status:"complete"` blocked while current floors are unmet;
- `createGoalState` converted to a named options object rather than adding positional floor args;
- budget-limited wrap-up prompts kept floor-free;
- monitor floor telemetry mutation stale-guarded by current active goal id and `completionBlockedByFloor`;
- strict tool validation but defensive replay of missing/malformed optional floor fields;
- bounded/default-safe floor history telemetry;
- enumerated queue/template floor propagation surfaces;
- stronger probes for wrong insertion order, stale monitor poisoning, same-call bypass, and agent-end suppression.

## Notes

No implementation code was changed by this planning workflow. The only intended durable changes from this workflow are the new issue doc and its transcript artifacts.
