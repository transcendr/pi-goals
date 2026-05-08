# ISSUE-021 — Refine durable/auditable goal completion proofs

Status: refine — needs design decision before execution
Priority: P1
Owner: unassigned
Created: 2026-05-08
Next best session: design refinement pass for proof gate schema and execution model
Next best session rationale: Proof commands involve trust, timeouts, freshness, and completion-blocking semantics.
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on: none
Related: `.ai/issues/refine/ISSUE-024-goal-audit-command.md`

Goal: Design goal completion proof gates: durable commands/conditions that must pass before a goal can be considered complete.

## Problem

The current continuation prompt asks the agent to audit completion, but completion is still ultimately a model judgment through `update_goal(status:"complete")`. Some goals should have explicit durable proof commands and pass/fail conditions, such as `exit 0` or output containing `SUCCESS`, that must pass before completion is allowed.

## Desired behavior sketch

A goal may include proof gates like:

```text
proofs:
  - command: npm test
    condition: exit 0
  - command: ./scripts/verify.sh
    condition: contains("SUCCESS")
```

Before `update_goal(status:"complete")` succeeds, the runtime or tool checks the gates and records proof results. Failed or stale proofs block completion with clear evidence.

## Open design questions

1. Are proof gates stored in goal state, prompt-doc frontmatter, subgoals, or all of the above?
2. Who runs proof commands: the model manually, the extension runtime, or a delegated verifier tool?
3. How are command timeouts, working directory, env vars, and output caps handled?
4. How fresh must a proof be relative to file changes or goal updates?
5. What condition DSL is safe and expressive enough (`exit 0`, `contains`, regex, JSON path)?
6. Can users override failed proofs, and how is that audited?

## Candidate acceptance criteria after refinement

- Proof gates are explicit, durable, and replayable with bounded output storage.
- Completion is blocked when required proofs have not passed or have gone stale.
- Conditions support at least exit status and output containment.
- Proof execution is non-interactive, timeout-limited, and output-capped.
- Proof results appear in goal summary/UI or a detail command.
- Proof gates do not replace the agent's qualitative completion audit; they complement it.

## Non-goals for first refinement

- Arbitrary shell execution from untrusted prompt docs without confirmation.
- Full CI/CD integration.
- Cryptographic attestation.

## Refinement todos

- [ ] Define proof schema and condition DSL.
- [ ] Decide runtime-executed vs agent-executed proof model.
- [ ] Define freshness/staleness semantics.
- [ ] Define completion-blocking behavior and override policy.
- [ ] Coordinate with reusable-goal prompt docs for proof frontmatter.
