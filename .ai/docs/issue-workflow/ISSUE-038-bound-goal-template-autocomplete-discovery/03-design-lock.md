# 03 — Design lock

Design fork: how should template discovery behave for autocomplete and template invocation?

Options considered:

1. Keep recursive discovery but add more skipped directories.
   - Rejected: brittle, platform-specific, still blocks on large arbitrary trees, and still risks privacy prompts for unlisted locations.
2. Cache recursive discovery results.
   - Rejected as the primary fix: first autocomplete in a home directory would still perform the dangerous scan; cache invalidation also adds complexity.
3. Move discovery to async/background work.
   - Rejected as the primary fix: better UI responsiveness but still performs broad filesystem access and privacy-prompting behavior.
4. Bound discovery to explicit, known template directories.
   - Chosen: only check safe candidate directories such as `<cwd>/.pi-goals` and `<cwd>/.ai/.pi-goals` rather than walking arbitrary descendants. Template file collection may still recurse within an actual template directory because that directory is explicitly the user's prompt-template tree.

Locked choice:

Implement bounded template discovery. `discoverGoalTemplates()` must not recursively search the entire `process.cwd()` tree to find `.pi-goals` directories. It should build a small candidate list and collect markdown templates only inside candidate directories that exist.

Required first-pass candidate directories:

- `<root>/.pi-goals`
- `<root>/.ai/.pi-goals`

Implementation details left to the execution session:

- Whether candidate construction lives in `templates.ts` as `findTemplateDirs()` replacement or a new helper.
- Whether to add a tiny per-root cache after bounding discovery. Cache is optional, not the primary safety mechanism.
- Whether to update README wording from "any `.pi-goals/` directory in your workspace" to the locked bounded locations.

Rejected alternatives:

- A recursive walk with an expanded skip list.
- Discovering nested `.pi-goals` under arbitrary project subdirectories by default.
- Relying on macOS permission denial handling as the safety mechanism.
- Hard-coding this repo's `.ai/.pi-goals` only and dropping root `.pi-goals` support.

Execution-ready assessment:

Execution-ready. The root cause is isolated to a small code path, the behavioral requirement is locked, and proof conditions can fail the current implementation without needing user-specific home-directory scanning.
