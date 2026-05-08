# ISSUE-008 — Raise goal objective character limit to 15K

Status: fixed — implemented and validated
Priority: P2
Owner: unassigned
Created: 2026-05-08

## Problem

The current objective limit is too low for real planning prompts. A 4,241 character objective fails against the current 4,000 character cap:

```text
Warning: Goal objective is too long (4241/4000 characters).
Put longer instructions in a file and refer to that file in the goal, for example: /goal follow the instructions in docs/goal.md.
```

## Requirement

Raise the objective character limit to approximately 15K characters.

## Scope

In scope:

- Change `MAX_OBJECTIVE_CHARS` from `4000` to `15000`.
- Ensure validation/error messages report the new limit.
- Keep long-objective guidance for inputs beyond 15K.

Out of scope:

- Changing persistence format.
- Changing continuation prompt structure.

## Acceptance criteria

- A 4,241 character objective is accepted.
- A 15,001 character objective is rejected with an accurate `15000` limit message.
- Existing objective trimming/normalization behavior is preserved.
- Sentrux gate/check pass.
- Pi extension load validation passes.

## Execution todos

- [ ] 008.1 Update `MAX_OBJECTIVE_CHARS` to `15000`.
- [ ] 008.2 Add or run a validation probe for accepted 4,241-character and rejected 15,001-character objectives.
- [ ] 008.3 Run Sentrux gate/check and Pi extension load validation; record `tsc` availability.


## Implementation closeout

Implemented objective limit increase:

- `MAX_OBJECTIVE_CHARS` changed from `4000` to `15000`.
- Existing `validateObjective` behavior now accepts 4,241-character objectives.
- 15,001-character objectives are rejected with an accurate `15000` limit message.
- Empty objective validation remains rejected.

Validation:

- jiti probe: 4,241 accepted; 15,001 rejected with `15000`; empty rejected.
- `sentrux gate .pi/extensions/goal` passed.
- `sentrux check .pi/extensions/goal` passed.
- `pi --offline --no-session --no-tools -e .pi/extensions/goal/index.ts --list-models` passed.
- `tsc` attempted but unavailable: `/bin/bash: tsc: command not found`.
