# 04 — Proof threat model

Issue: ISSUE-013 — `/goal update` natural-language goal updates
Date: 2026-05-10

## Primary invariant

A `/goal update <request>` command must never silently or ambiguously mutate goal state. It must parse only a bounded deterministic grammar, display a structured proposal, require confirmation, and apply the same update semantics as the trusted `update_goal` path.

## High-risk false greens

| Risk | Failure mode | Required proof |
|---|---|---|
| Parser overreach | Free prose is accepted as a mutation by best-effort heuristics | Negative parser probes for ambiguous requests leave state unchanged and print supported grammar guidance |
| Trust-boundary leak | Current objective or model output influences update extraction | Static probe confirms no hidden model prompt/extraction path and parser is deterministic/local |
| Confirmation bypass | Destructive or surprising edits apply without user confirmation | Command probe with mocked UI confirms parsed proposal waits for `Apply update` and `Cancel` leaves state unchanged |
| Completion bypass | `/goal update mark complete` reaches complete state without proof/floor/tool gates | Probe confirms completion phrases are refused and no `status:"complete"` candidate is applied |
| Budget unit confusion | `10m` is misread as tokens or time, or plain `10` time budget is silently seconds | Literal parser probes cover token suffixes, duration suffixes, rejection of ambiguous duration integers, and invalid numbers |
| Objective replacement confusion | Objective edit accidentally creates a new goal or resets telemetry | Probe confirms objective update preserves `goalId`, usage, budgets, floors, and uses update persistence |
| Progress as completion | `set progress to 100%` marks complete or counts as productive work | Probe confirms progress remains advisory, goal status unchanged, and lifecycle progress accounting follows ISSUE-014 |
| Tool/command divergence | `/goal update` implements separate validation that disagrees with `update_goal` | Static and behavioral probes require shared update application or identical validation outcomes |

## Adversarial examples

Must refuse without mutation:

- `/goal update make the budget reasonable`
- `/goal update probably done now`
- `/goal update mark complete`
- `/goal update set time budget to 10`
- `/goal update set progress to complete`
- `/goal update add docs` unless phrased as an explicit objective edit/append form

Must propose and require confirmation:

- `/goal update set token budget to 5M`
- `/goal update clear time budget`
- `/goal update set time floor to 10 minutes`
- `/goal update change objective to ship docs after validation`
- `/goal update append to objective: include README validation`
- `/goal update set progress to 40% note parser implemented` after ISSUE-014 lands

## Proof design requirements

Implementation must include deterministic validation probes under `.ai/validation/` or equivalent test fixtures that exercise:

- accepted parser cases;
- refused parser cases;
- confirmation apply/cancel behavior;
- completion phrase refusal;
- budget/floor literal validation;
- objective edit identity preservation;
- progress advisory-only behavior if progress support is included;
- command/tool update semantic alignment.

## Non-proof pitfalls

- A green TypeScript build alone is insufficient because the main risk is semantic parser behavior.
- Manual live testing alone is insufficient because ambiguous parse regressions need deterministic negative tests.
- Sentrux alone is insufficient because it measures structure, not mutation safety.
