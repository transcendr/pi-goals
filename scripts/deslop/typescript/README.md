# pi-goals TypeScript Deslop Checks

Project-local TypeScript deslop checks live here so they can be committed and run consistently by future agents/CI without depending on a user-global skill checkout.

## Goal extension scan

```bash
npm run gates:deslop
```

`gates:deslop` runs `deslop-ts-scan.mjs` over `.pi/extensions/goal` and fails on hard errors:

- `as any` / `as unknown as` escape hatches;
- identical ternary branches;
- simple identical `if/else` branches.

The scanner also contains warning/lead checks for long positional parameter lists, bare delays, non-null assertions, and optional-call assumptions. Run the broader non-blocking report manually during deslop work:

```bash
npm run scans:deslop
```

The script is copied from the global `$deslop` skill's `scripts/typescript/deslop-ts-scan.mjs` and intentionally has no dependencies.

## Scanner self-test

`deslop-ts-scan.test.mjs` tests this scanner script with temporary fixture files. It is scanner-maintenance validation, not a pi-goals extension test, so it is intentionally documented here rather than exposed through package-level npm scripts or `gates:quality`.

Run it only when editing the scanner:

```bash
node scripts/deslop/typescript/deslop-ts-scan.test.mjs
```
