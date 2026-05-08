# ISSUE-004 — `/goal` subcommand fuzzy autocomplete

Status: refine  
Priority: medium  
Parent issue: `.ai/issues/open/ISSUE-001-pi-goal-extension.md`  
Depends on: first complete `pi-goal` command implementation under `.pi/extensions/goal/`  
Goal: Improve `/goal` UX by adding fuzzy autocomplete for supported subcommands.

## Problem

The first `pi-goal` implementation supports subcommands such as:

- `/goal pause`
- `/goal resume`
- `/goal clear`

But the command UX currently relies on users remembering and typing those subcommands exactly. This is weaker than the expected Pi command experience for discoverability and fast interactive use.

## Desired behavior

When the user types `/goal <partial>`, Pi should offer fuzzy autocomplete suggestions for valid `/goal` subcommands.

Examples:

- `/goal p` suggests `pause`
- `/goal res` suggests `resume`
- `/goal c` suggests `clear`
- minor fuzzy/substring matches should work where Pi autocomplete APIs support them

Autocomplete should only suggest known subcommands, not arbitrary goal objectives.

## Scope

First pass autocomplete targets:

- `pause` — pause the current goal
- `resume` — resume a paused goal
- `clear` — clear the current goal

Potential later additions if commands are added:

- `status`
- `history`
- `audit`
- `budget`

## Design notes

- Keep autocomplete implementation local to the goal command/module, likely `command.ts` or a small helper if Pi's API encourages it.
- Use Pi's documented extension autocomplete/command suggestion API if available.
- Suggestions should include short descriptions where the API supports metadata.
- Do not autocomplete objective text; objective entry should remain freeform.
- Do not change command semantics.

## Acceptance criteria

- Typing `/goal` with a partial subcommand in interactive Pi presents fuzzy suggestions for `pause`, `resume`, and `clear`.
- Selecting a suggestion inserts/completes the subcommand in the editor.
- Existing `/goal` command behavior remains unchanged.
- No irrelevant objective text suggestions are introduced.
- Sentrux gate/check pass for `.pi/extensions/goal` after implementation.

## Implementation tasks

1. Research Pi extension autocomplete APIs and examples.
2. Identify the correct registration surface for command/subcommand suggestions.
3. Add `/goal` subcommand suggestion provider for `pause`, `resume`, and `clear`.
4. Keep suggestion data declarative and reusable by command help/summary if practical.
5. Validate manually in interactive Pi TUI.
6. Run Sentrux gate/check against `.pi/extensions/goal`.

## Open questions

- Does Pi expose command-specific argument completion, or only general editor autocomplete providers?
- Can suggestions be scoped to `/goal ` prefix without polluting general text autocomplete?
- Does Pi's fuzzy matching happen automatically, or does the extension provider need to implement matching?
