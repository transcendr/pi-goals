# 05 — Issue writeback

Issue written:
- `.ai/issues/open/ISSUE-042-harden-compaction-continuation-with-pre-compact-queueing.md`

Sections written:
- front matter/status fields: `open — execution-ready`, P0, parent ISSUE-039, next best session implementation-readiness
- Goal
- Problem/context with live `/tree export` failure shape
- Desired behavior
- Transcript artifacts
- Research findings
- Locked design choices and rejected alternatives
- TOON synthesis
- Implementation checklist
- Acceptance criteria
- Proof threat model
- Required proofs TOON block
- Related side-note for acceptance-pipeline prompt hardening

Key writeback decisions:
- Locked no-Pi-core-change posture per user instruction.
- Primary remediation is pre-compaction real queued hidden follow-up/handoff.
- Fallback remediation is bounded post-compaction retry for transient readiness skips.
- Required proofs emphasize runtime/mocked behavior probes and reject static-source-only acceptance.
- Acceptance-pipeline hardening is recorded as a related side-note/follow-up, not part of ISSUE-042's required implementation scope, because the goal stack has a separate item for that work.

Traceability:
- All execution-readiness artifact links were added to the issue doc.
- Required proof rows are importable TOON-style rows for Solo/TLO proof closeout.
