# 05 Issue Writeback — ISSUE-046

## Canonical issue path

`.ai/issues/open/ISSUE-046-untruncated-goal-queue-listing-for-agents.md`

## Sections written

- Front matter/status fields
- Target repo roots
- Goal
- Transcript artifacts
- Problem/context
- Desired behavior
- Grounded research findings
- Locked design choices and rejected alternatives
- Execution checklist
- Acceptance criteria
- Proof threat model
- TOON synthesis
- Required proofs

## Status decision

`open — execution-ready`

Rationale:

- The live bug is grounded in inspected code and Pinotator session evidence.
- The chosen API behavior is locked: compact default plus explicit full/details mode.
- Backward compatibility expectations are explicit.
- Token-safety constraints are explicit.
- Required proofs are concrete and aligned with the primary invariant.

## Artifact links added

The issue links all execution-readiness artifacts:

- `00-request.md`
- `01-protocol-read.md`
- `02-grounded-research.md`
- `03-design-lock.md`
- `04-proof-threat-model.md`
- `05-issue-writeback.md`
- `06-final-audit.md`
- `raw/commands.log`

## Not implemented in this pass

This pass created the execution-ready issue doc only. It did not change `.pi/extensions/goal/*`, add probes, or run implementation quality gates.
