# 05 Issue writeback

Canonical issue written:
- `.ai/issues/open/ISSUE-027-goal-queue.md`

Sections written:
- front matter/status/priority/owner/created/next best session
- target bucket and issue kind
- parent/depends/related links
- goal
- problem/context
- transcript artifact links
- grounded research findings
- desired behavior
- locked design choices
- rejected alternatives
- implementation checklist
- acceptance criteria
- proof threat model
- TOON synthesis
- required_proofs[] TOON block

Key writeback decisions:
- Scope is locked to persisted sequential FIFO queue, not full parallel multi-goal runtime.
- Queue preserves the single-active-goal invariant.
- Next queued goal is surfaced to the agent through a stale-guarded prompt; it is not silently started.
- `/goal queue` and model-facing queue tools are both required.
- Existing template resolution and objective validation must be reused for queued objectives.
