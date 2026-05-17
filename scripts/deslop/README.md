# Project-local Deslop Checks

Committed deslop checks for pi-goals live under `scripts/deslop/<language>/` so future agents can run the same policy without depending on a user-global skill checkout.

Current suite:

- `typescript/deslop-ts-scan.mjs` — scans `.pi/extensions/goal` for hard TypeScript slop errors and optional warning/lead review signals.
- `typescript/deslop-ts-scan.test.mjs` — self-test fixture that keeps the scanner honest when it is edited locally.

Blocking deslop gate:

```bash
npm run gates:deslop
```

Broader non-blocking review scan:

```bash
npm run scans:deslop
```

Use `/tmp/deslop-pi-goals-*` for throwaway probes that are not expected to be reused.
