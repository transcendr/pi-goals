# 05-issue-writeback — ISSUE-026

## Canonical issue doc written

Path:

```text
.ai/issues/open/ISSUE-026-nl-reusable-goal-prompts.md
```

## Sections written

- Title and front matter: status, priority, owner, created date, next best session, bucket/kind, target roots, parent/dependencies/related.
- Goal.
- Problem/context.
- Transcript artifact links.
- Grounded research findings.
- Desired behavior.
- Locked design choices.
- Intent and safety boundary.
- Rejected alternatives.
- Implementation checklist.
- Acceptance criteria.
- Proof threat model.
- Concrete `required_proofs[]` rows.

## Planning truth written back

- The feature is not prompt-guidelines-only.
- The deterministic `.pi-goals` resolver remains authoritative.
- Add a model-facing tool/API path for template inventory and template-backed goal creation.
- Explicit persistent-goal intent remains mandatory.
- Missing placeholders must fail clearly rather than being guessed.
- Existing slash template behavior must not regress.

## Artifact links included

The issue doc links all required artifacts:

- `00-request.md`
- `01-protocol-read.md`
- `02-grounded-research.md`
- `03-design-lock.md`
- `04-proof-threat-model.md`
- `05-issue-writeback.md`
- `06-final-audit.md`
- `raw/commands.log`
