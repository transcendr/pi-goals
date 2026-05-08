# ISSUE-004 — `/goal` subcommand fuzzy autocomplete

Status: open — execution-ready
Priority: medium
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on: implemented `/goal` command in `.pi/extensions/goal/command.ts`
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Next best session: small UX implementation pass
Goal: Improve `/goal` discoverability by adding scoped fuzzy autocomplete for supported control subcommands.

## Problem

The `/goal` command supports `pause`, `resume`, and `clear`, but users must remember exact words. Pi supports command argument completions, so the command should offer subcommand suggestions without interfering with freeform objective text.

## Research evidence

Pi extension API exposes command-local argument completions:

- `RegisteredCommand.getArgumentCompletions?: (argumentPrefix: string) => AutocompleteItem[] | null | Promise<AutocompleteItem[] | null>`.
- Docs include `pi.registerCommand("deploy", { getArgumentCompletions: ... })`.
- This avoids a global `ctx.ui.addAutocompleteProvider()` and scopes suggestions to `/goal` arguments.

## Design locks

- Use `registerCommand("goal", { getArgumentCompletions })` in `command.ts`.
- Keep subcommand metadata declarative near command parsing.
- Suggestions are limited to control subcommands: `pause`, `resume`, `clear`.
- Fuzzy matching is implemented locally as case-insensitive prefix/substring/ordered-character matching because API-level fuzzy behavior should not be assumed.
- Return `null` when the input looks like freeform objective text rather than a single partial control token.
- Do not autocomplete objective text.
- Do not change command behavior or command names.

## Execution TOON

```toon
issue: ISSUE-004
status: execution-ready
locks[5]:
  - command-local-getArgumentCompletions
  - declarative-subcommand-table
  - local-fuzzy-match
  - no-objective-autocomplete
  - no-command-semantics-change
files[2]: command.ts, types.ts
suggestions[3]: pause, resume, clear
validation[4]: prefix-match, substring-or-fuzzy-match, objective-text-no-suggestions, existing-command-behavior
```

## Implementation path

1. Add a declarative `GOAL_SUBCOMMANDS` table in `command.ts` or a tiny helper module if reuse grows:
   - `pause` — pause the current goal;
   - `resume` — resume a paused goal;
   - `clear` — clear the current goal.
2. Use the table for control parsing where practical, while keeping current exact command semantics.
3. Add `getArgumentCompletions(argumentPrefix)` to `pi.registerCommand("goal", ...)`.
4. Implement completion guard:
   - trim leading whitespace;
   - if the remaining string contains whitespace, return `null` because it is objective text or a multi-word input;
   - if empty or one token, return matching subcommands.
5. Implement matching:
   - empty string returns all supported subcommands;
   - case-insensitive prefix match ranks first;
   - substring and ordered-character fuzzy matches rank after prefix matches.
6. Return `AutocompleteItem[]` with `value`, `label`, and `description` where supported by Pi TUI types.
7. Add mock/unit coverage for completion inputs such as `""`, `"p"`, `"res"`, `"clr"`, `"ea"`, and `"write tests"`.
8. Validate manually in interactive Pi TUI.
9. Run `sentrux gate .pi/extensions/goal` and `sentrux check .pi/extensions/goal`.

## Acceptance criteria

- Typing `/goal p` suggests `pause`.
- Typing `/goal res` suggests `resume`.
- Typing `/goal c` suggests `clear`.
- Minor fuzzy/substring matches work through local matching.
- Suggestions are scoped to the `/goal` command argument position.
- Objective text is not autocompleted.
- Existing `/goal` behavior remains unchanged.
- Sentrux gate/check pass for `.pi/extensions/goal` after implementation.

## Non-goals

- Do not add new subcommands.
- Do not implement global editor autocomplete.
- Do not parse or autocomplete goal objectives.
