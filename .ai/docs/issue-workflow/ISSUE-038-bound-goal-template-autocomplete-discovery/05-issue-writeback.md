# 05 — Issue writeback

Canonical issue written:

- `.ai/issues/open/ISSUE-038-bound-goal-template-autocomplete-discovery.md`

Sections included:

- Title and front matter: status, priority, owner, created date, next best session, bucket/kind, target repo root, related issues.
- Goal.
- Problem/context.
- Desired behavior.
- Transcript artifact links for all required artifacts.
- Grounded research findings linked to `02-grounded-research.md`.
- Locked design choices and rejected alternatives linked to `03-design-lock.md`.
- Valid TOON synthesis block.
- Implementation checklist.
- Acceptance criteria.
- Proof threat model.
- Valid TOON `required_proofs[]` block.

Key writeback decisions:

- Status set to `open — execution-ready` because root cause, design, and proof strategy are locked.
- Priority set to `P0` because the behavior can freeze Pi and trigger OS privacy prompts.
- Next best session set to `green-loop implementation` because this is a compact code fix with high false-green risk.
- Chosen design recorded as bounded explicit candidate directories: `<root>/.pi-goals` and `<root>/.ai/.pi-goals`.
- Required proofs include a deterministic nested-decoy probe, `npm run quality:goal`, and a live-probe closeout artifact or explicit skip reason.
