# 02 — Grounded research

Commands recorded in `raw/commands.log`.

Files inspected:
- `.pi/extensions/goal/command.ts`
- `.ai/.pi-goals/*`

Findings:

1. `/goal` autocomplete is registered through `getArgumentCompletions: goalArgumentCompletions` in `registerGoalCommand()`.
2. `goalArgumentCompletions(argumentPrefix)` currently does:

```ts
const query = argumentPrefix.trimStart();
if (/\s/.test(query)) return null;
```

3. That means any prefix containing whitespace disables autocomplete entirely.
4. Root template autocomplete works because root input such as `cre` or `dirty` has no whitespace. It fuzzy-filters `discoverGoalTemplates()` by template name or alias.
5. Queue-template input necessarily contains whitespace, e.g. `queue cre`, so autocomplete returns `null` before template matching runs.
6. The queue command exists as a subcommand, and the intended `/goal queue <template>` behavior depends on the same reusable template inventory as root `/goal <template>`.

Likely root cause:
- Autocomplete treats all whitespace as "argument already too complex" and has no subcommand-aware path for queue trailing arguments.

Implementation surface:
- `.pi/extensions/goal/command.ts` `goalArgumentCompletions()`.
- Possible extraction of a reusable `templateCompletions(query, valuePrefix?)` helper so root and queue autocomplete share matching behavior.
