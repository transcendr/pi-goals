# 02 — Grounded research

Research commands and copied outputs are in `raw/commands.log`.

Files inspected:

- `.pi/extensions/goal/command.ts`
- `.pi/extensions/goal/templates.ts`
- `README.md`
- `package.json`
- `.ai/issues/fixed/ISSUE-031-goal-queue-template-autocomplete.md`

Findings:

1. `/goal` autocomplete is registered through `pi.registerCommand("goal", { getArgumentCompletions: goalArgumentCompletions, ... })` in `.pi/extensions/goal/command.ts`.
2. `goalArgumentCompletions(argumentPrefix)` calls `templateCompletions(query)` whenever the current `/goal` argument prefix is a first token, and also after `queue `.
3. `templateCompletions()` calls `discoverGoalTemplates()` on every completion request.
4. `discoverGoalTemplates(root = process.cwd())` calls `findTemplateDirs(root)`, which recursively walks the whole `root` directory looking for directories named `.pi-goals`.
5. The recursive walk is synchronous: `readdirSync()` for every visited directory and `statSync()` for every entry. Errors are swallowed, but the access attempts still happen.
6. The skip list is small: `.git`, `node_modules`, `references`, `dist`, `build`, `.next`, `.cache`. It does not exclude common home-directory or macOS privacy-protected locations such as Desktop, Documents, Downloads, Library, iCloud/CloudStorage, Pictures, or external provider folders.
7. A local simulation with only 200 empty subdirectories performed 201 synchronous directory reads and 200 stats before finding no templates. That scales linearly with the directory tree size and would be much worse from `/Users/bryan`.
8. This repo has templates under `./.ai/.pi-goals`, not `./.pi-goals`, so a fix must preserve that project-local template location.
9. README documents reusable templates as `.pi-goals/` directories in the workspace and specifically references this repo's `.ai/.pi-goals/` templates.
10. Existing ISSUE-031 fixed queue-template autocomplete by reusing root template completion. That means the problematic scan path now affects both root `/goal <prefix>` and `/goal queue <prefix>` completions.

Root-cause statement:

The likely freeze/permission storm is caused by synchronous recursive template directory discovery during every slash-command autocomplete calculation. Starting Pi in a broad directory such as the user's home makes `process.cwd()` equal a tree containing many large or privacy-gated folders, so simply typing `/goal <string>` can trigger a full home-tree traversal from the TUI autocomplete path.

Safety note:

I did not run the current recursive discovery against `/Users/bryan` because that would intentionally reproduce the privacy/CPU problem reported by the user.
