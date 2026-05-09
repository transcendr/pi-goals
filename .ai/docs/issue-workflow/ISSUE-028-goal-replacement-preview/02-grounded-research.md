# 02 — Grounded research

Commands recorded in `raw/commands.log`.

Files inspected:
- `.pi/extensions/goal/command.ts`
- `.pi/extensions/goal/ui.ts`

Findings:

1. `/goal <text/template>` goes through `handleGoalCommand()` and then `setGoalObjective()` after `resolveTemplateOrObjective(trimmed, ctx)`.
2. `resolveTemplateOrObjective()` already returns the fully resolved template objective string when the argument is a reusable template invocation.
3. `setGoalObjective()` validates that resolved objective, then checks `const existing = getGoal()`.
4. When an existing goal is present, it now calls:

```ts
const choices = ["Replace", "Queue", "Cancel"];
const choice = await ctx.ui.select("Goal already active. Choose action:", choices);
```

5. The prompt text passed to `ctx.ui.select()` contains only the generic message, not the resolved `validation.objective`.
6. `showGoalSummary()` and `notifyGoal()` exist in `ui.ts`, but the replacement decision path does not call a preview/summary helper before selecting.

Likely root cause:
- The queue feature changed the existing-goal flow to Replace/Queue/Cancel but did not preserve the previous resolved objective preview in the selection prompt or a preceding notification.

Implementation surface:
- Primary: `.pi/extensions/goal/command.ts` existing-goal branch in `setGoalObjective()`.
- Possible helper: `.pi/extensions/goal/format.ts` if preview formatting should be shared/truncated consistently.

