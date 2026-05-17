#!/usr/bin/env node
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "deslop-ts-scan.mjs");
const workspace = mkdtempSync(path.join(tmpdir(), "deslop-ts-scan-test."));

try {
	writeFileSync(path.join(workspace, "bad.ts"), `
const escaped = value as any;
const same = flag ? floorResult.goal : floorResult.goal;
if (flag) { return next; } else { return next; }
function wire(a, b, c, d, e) { return a + b + c + d + e; }
setTimeout(() => run(), 1000);
maybe?.();
console.log("done");
const forced = item!.name;
`, "utf8");
	writeFileSync(path.join(workspace, "strings-are-not-identical.ts"), `
const label = ok ? theme.fg("success", "met") : theme.fg("warning", "before wrap-up");
const docs = "const fake = value as any; flag ? one : one";
`, "utf8");

	const failing = spawnSync(process.execPath, [scriptPath, "--format", "json", workspace], { encoding: "utf8" });
	assert(failing.status === 1, `expected default scan to fail on hard errors, got ${failing.status}\n${failing.stdout}\n${failing.stderr}`);
	const failingJson = JSON.parse(failing.stdout);
	const checks = failingJson.findings.map((item) => item.check);
	assert(checks.includes("type-escape-hatch"), "expected type escape hatch finding");
	assert(checks.includes("identical-ternary-branches"), "expected identical ternary finding");
	assert(checks.includes("identical-if-else-branches"), "expected identical if/else finding");
	assert(checks.includes("long-positional-params"), "expected long positional params warning");
	assert(checks.includes("bare-delay"), "expected bare delay finding");
	assert(checks.includes("optional-call-assumed"), "expected optional call lead");
	assert(checks.includes("non-null-assertion"), "expected non-null assertion lead");
	assert(!failingJson.findings.some((item) => item.path.endsWith("strings-are-not-identical.ts") && item.check === "identical-ternary-branches"), "string literal differences must not be collapsed into identical ternaries");

	const quiet = spawnSync(process.execPath, [scriptPath, "--fail-on", "none", "--report-min", "error", "--format", "json", workspace], { encoding: "utf8" });
	assert(quiet.status === 0, `expected --fail-on none to pass, got ${quiet.status}`);
	const quietJson = JSON.parse(quiet.stdout);
	assert(quietJson.reportedFindings === 3, `expected only 3 hard findings reported, got ${quietJson.reportedFindings}`);
	assert(quietJson.totalFindings >= quietJson.reportedFindings, "total findings should include lower-severity leads");

	console.log("deslop_ts_scan_tests:");
	console.log("  status: pass");
	console.log("  cases: 2");
} finally {
	rmSync(workspace, { recursive: true, force: true });
}

function assert(condition, message) {
	if (!condition) throw new Error(message);
}
