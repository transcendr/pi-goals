# 04 — Proof threat model

Primary invariant:

`/goal` autocomplete and template resolution must never recursively traverse arbitrary `process.cwd()` descendants just to discover `.pi-goals` directories; starting Pi in a broad home directory with no templates must be fast, bounded, and free of privacy-folder probing.

False-green risks:

- The test only runs in this repo, where `.ai/.pi-goals` is shallow, so the recursive walk appears fast.
- The fix preserves `/goal <template>` but breaks `/goal queue <template>`.
- The fix only changes autocomplete, while `list_goal_templates` or template invocation still recursively scans a home directory.
- The fix removes `.ai/.pi-goals` support and only checks root `.pi-goals`.
- The test uses elapsed time only, which can pass on a fast machine despite still scanning nested directories.
- A cache hides recursive behavior after the first call but the first call remains dangerous.

Proof strategy:

- Deterministic unit-style probe must create a temporary workspace with nested decoy `.pi-goals` directories under unrelated subdirectories and assert those decoy templates are not discovered. This fails the current recursive implementation without relying on timing.
- Deterministic preservation probe must create `.ai/.pi-goals` and/or `.pi-goals` candidate directories and assert both root `/goal <prefix>` and `/goal queue <prefix>` completions still return expected templates.
- Integration quality gate remains `npm run quality:goal`.
- A live probe is recommended after implementation because the bug affects slash-command autocomplete/runtime behavior. It can be bounded: start Pi in a disposable temporary home-like directory with many nested directories and no candidate templates, type `/goal x`, and verify no freeze/permission prompt. Do not live-probe by scanning the real home directory.

Required proof rows to carry into the issue doc:

- bounded discovery probe: nested decoy templates are ignored; `.ai/.pi-goals` and root `.pi-goals` are preserved; queue and root completions work.
- quality gate: `npm run quality:goal` passes.
- live probe or explicitly documented skip reason: bounded disposable Pi runtime check for autocomplete responsiveness.
