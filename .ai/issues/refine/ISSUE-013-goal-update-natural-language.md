# ISSUE-013 — Refine `/goal update "natural language"`

Status: refine — needs design decision before execution
Priority: P2
Owner: unassigned
Created: 2026-05-08
Next best session: design refinement pass for natural-language goal updates
Next best session rationale: The feature has parser/trust-boundary/confirmation forks that must be locked before implementation.
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on: `.ai/issues/fixed/ISSUE-010-goal-update-telemetry-completion-semantics.md`

Goal: Design a user-facing `/goal update <natural language request>` command that lets the user revise the current goal through prose without requiring direct tool JSON or replacing the whole goal accidentally.

## Problem

Current user command support covers bare summary, objective replacement, pause, resume, and clear. Natural-language updates such as "extend the token budget to 5M", "mark this goal paused after the current step", or "change the objective to include docs" currently rely on the model choosing `update_goal` correctly, or the user using direct model instructions.

## Desired behavior sketch

- `/goal update extend token budget to 5M`
- `/goal update add a 10 minute time budget`
- `/goal update change the objective to also include docs validation`
- `/goal update remove the time budget`
- `/goal update mark complete` only if explicit and confirmed/audited as appropriate

The command should parse or delegate prose safely, show the proposed structured mutation, and require confirmation for destructive/ambiguous changes.

## Open design questions

1. Should parsing be deterministic for known fields only, or model-assisted through a hidden extraction prompt?
2. If model-assisted, where is the trust boundary and how is the proposed mutation confirmed?
3. Should `/goal update` ever be allowed to mark complete, or should completion stay model-tool-only after audit?
4. How should objective changes differ from full replacement with a fresh `goalId`?
5. Should budget strings support human formats (`5M`, `10m`, `1h`) or only integers/seconds?

## Candidate acceptance criteria after refinement

- Ambiguous prose never silently mutates a goal.
- Parsed updates are displayed as structured changes before application when user confirmation is needed.
- Budget edits reuse the same recompute/continuation rules as `update_goal`.
- Objective replacement rules preserve `goalId` only when the chosen design says the update is an edit, not a new goal.
- `/goal update` cannot bypass budget, pause, or completion invariants.
- Sentrux gate/check and Pi load validation pass after implementation.

## Non-goals for first refinement

- Full natural-language planning engine.
- Arbitrary prompt injection from the goal objective into update parsing.
- Silent bulk mutation of subgoals or proofs before those features exist.

## Refinement todos

- [ ] Decide deterministic parser vs model-assisted extraction.
- [ ] Define confirmation rules for each mutation kind.
- [ ] Define objective edit vs replacement semantics.
- [ ] Specify budget literal syntax and validation.
- [ ] Move to open only after the trust boundary and UX are locked.
