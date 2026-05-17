#!/usr/bin/env node
/**
 * Heuristic TypeScript deslop scanner.
 *
 * This is a lead-generating quality sensor, not a parser or proof engine. It is
 * intentionally dependency-free so it can be copied into project-local
 * scripts/deslop/typescript/ directories and used in CI without package churn.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = "0.1.0";
const DEFAULT_FAIL_ON = "error";
const DEFAULT_FORMAT = "toon";
const DEFAULT_REPORT_MIN = "lead";
const SKIP_DIRS = new Set([
	".git",
	".hg",
	".svn",
	"node_modules",
	"vendor",
	"dist",
	"build",
	"coverage",
	".next",
	".nuxt",
	".svelte-kit",
	".turbo",
	".cache",
	"out",
	"target",
]);
const TS_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const SEVERITY_RANK = new Map([
	["none", 0],
	["lead", 1],
	["warning", 2],
	["error", 3],
]);

function printHelp() {
	console.log(`deslop-ts-scan ${VERSION}

Usage:
  node scripts/typescript/deslop-ts-scan.mjs [options] <file-or-dir>...

Options:
  --fail-on <error|warning|lead|none>  Minimum severity that exits non-zero. Default: ${DEFAULT_FAIL_ON}
  --format <toon|json|text>            Output format. Default: ${DEFAULT_FORMAT}
  --report-min <error|warning|lead|none>
                                      Minimum severity to print. Default: ${DEFAULT_REPORT_MIN}
  --max-findings <n>                   Limit reported findings. Default: unlimited
  --help                               Show this help

Checks:
  error    type-escape-hatch           Flags 'as any' and 'as unknown as'
  error    identical-ternary-branches  Flags ternaries whose true/false branches normalize identically
  error    identical-if-else-branches  Flags simple if/else blocks with identical bodies
  warning  long-positional-params      Flags functions/arrow functions with 5+ positional params
  warning  bare-delay                  Flags setTimeout/setInterval numeric delay literals
  lead     non-null-assertion          Flags expr! assertions for human review
  lead     optional-call-assumed       Flags side-effectful optional calls that nearby code may assume ran

Notes:
  - Output is designed for agents. Findings are review leads unless the severity is error.
  - The scanner strips comments and strings before matching to avoid documentation false positives.
  - Prefer project-local wrappers under scripts/deslop/typescript/ for repository policy.`);
}

function parseArgs(argv) {
	const options = {
		failOn: DEFAULT_FAIL_ON,
		format: DEFAULT_FORMAT,
		reportMin: DEFAULT_REPORT_MIN,
		maxFindings: undefined,
		paths: [],
	};
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--help" || arg === "-h") {
			options.help = true;
			continue;
		}
		if (arg === "--fail-on") {
			const value = argv[index + 1];
			if (!value || !SEVERITY_RANK.has(value)) throw new UsageError("--fail-on must be one of error, warning, lead, none");
			options.failOn = value;
			index += 1;
			continue;
		}
		if (arg === "--format") {
			const value = argv[index + 1];
			if (!value || !["toon", "json", "text"].includes(value)) throw new UsageError("--format must be toon, json, or text");
			options.format = value;
			index += 1;
			continue;
		}
		if (arg === "--report-min") {
			const value = argv[index + 1];
			if (!value || !SEVERITY_RANK.has(value)) throw new UsageError("--report-min must be one of error, warning, lead, none");
			options.reportMin = value;
			index += 1;
			continue;
		}
		if (arg === "--max-findings") {
			const value = argv[index + 1];
			const parsed = Number(value);
			if (!Number.isInteger(parsed) || parsed <= 0) throw new UsageError("--max-findings must be a positive integer");
			options.maxFindings = parsed;
			index += 1;
			continue;
		}
		if (arg.startsWith("--")) throw new UsageError(`Unknown option: ${arg}`);
		options.paths.push(arg);
	}
	if (options.paths.length === 0) options.paths.push(".");
	return options;
}

class UsageError extends Error {}

function collectTypeScriptFiles(inputs, cwd) {
	const files = [];
	const seen = new Set();
	for (const input of inputs) {
		const resolved = path.resolve(cwd, input);
		if (!existsSync(resolved)) throw new UsageError(`Path not found: ${input}`);
		walk(resolved, files, seen);
	}
	files.sort((left, right) => left.localeCompare(right));
	return files;
}

function walk(target, files, seen) {
	const stats = statSync(target);
	if (stats.isDirectory()) {
		if (SKIP_DIRS.has(path.basename(target))) return;
		for (const entry of readdirSync(target)) walk(path.join(target, entry), files, seen);
		return;
	}
	if (!stats.isFile()) return;
	if (!TS_EXTENSIONS.has(path.extname(target))) return;
	const real = path.resolve(target);
	if (seen.has(real)) return;
	seen.add(real);
	files.push(real);
}

function analyzeFile(file, cwd) {
	const source = readFileSync(file, "utf8");
	const stripped = stripCommentsAndStrings(source);
	const lineStarts = computeLineStarts(source);
	const relativePath = path.relative(cwd, file);
	const displayPath = relativePath.startsWith("..") ? file : relativePath || path.basename(file);
	const context = { file, displayPath, source, stripped, lineStarts };
	return [
		...findTypeEscapeHatches(context),
		...findIdenticalTernaryBranches(context),
		...findIdenticalIfElseBranches(context),
		...findLongPositionalParameterLists(context),
		...findBareDelays(context),
		...findNonNullAssertions(context),
		...findOptionalCallAssumptions(context),
	];
}

function stripCommentsAndStrings(source) {
	let output = "";
	let index = 0;
	while (index < source.length) {
		const char = source[index];
		const next = source[index + 1];
		if (char === "/" && next === "/") {
			const end = source.indexOf("\n", index + 2);
			const stop = end === -1 ? source.length : end;
			output += preserveNewlinesAsSpaces(source.slice(index, stop));
			index = stop;
			continue;
		}
		if (char === "/" && next === "*") {
			const end = source.indexOf("*/", index + 2);
			const stop = end === -1 ? source.length : end + 2;
			output += preserveNewlinesAsSpaces(source.slice(index, stop));
			index = stop;
			continue;
		}
		if (char === '"' || char === "'" || char === "`") {
			const stop = consumeStringLike(source, index, char);
			output += preserveNewlinesAsSpaces(source.slice(index, stop));
			index = stop;
			continue;
		}
		output += char;
		index += 1;
	}
	return output;
}

function consumeStringLike(source, start, quote) {
	let index = start + 1;
	while (index < source.length) {
		const char = source[index];
		if (char === "\\") {
			index += 2;
			continue;
		}
		if (char === quote) return index + 1;
		index += 1;
	}
	return source.length;
}

function preserveNewlinesAsSpaces(value) {
	return value.replace(/[^\n]/g, " ");
}

function computeLineStarts(source) {
	const starts = [0];
	for (let index = 0; index < source.length; index += 1) {
		if (source[index] === "\n") starts.push(index + 1);
	}
	return starts;
}

function locationAt(lineStarts, index) {
	let low = 0;
	let high = lineStarts.length - 1;
	while (low <= high) {
		const middle = Math.floor((low + high) / 2);
		if (lineStarts[middle] <= index) low = middle + 1;
		else high = middle - 1;
	}
	const lineIndex = Math.max(0, low - 1);
	return { line: lineIndex + 1, column: index - lineStarts[lineIndex] + 1 };
}

function finding(context, index, severity, check, message, snippet) {
	const location = locationAt(context.lineStarts, index);
	return {
		severity,
		check,
		path: context.displayPath,
		line: location.line,
		column: location.column,
		message,
		snippet: compactSnippet(snippet ?? lineAt(context.source, index)),
	};
}

function lineAt(source, index) {
	const start = source.lastIndexOf("\n", index) + 1;
	const end = source.indexOf("\n", index);
	return source.slice(start, end === -1 ? source.length : end);
}

function compactSnippet(value) {
	return value.replace(/\s+/g, " ").trim().slice(0, 180);
}

function findTypeEscapeHatches(context) {
	const findings = [];
	const pattern = /\bas\s+(?:unknown\s+as\s+)?any\b/g;
	for (const match of context.stripped.matchAll(pattern)) {
		findings.push(finding(
			context,
			match.index ?? 0,
			"error",
			"type-escape-hatch",
			"Type escape hatch hides the real runtime shape; narrow unknown or define a precise type instead.",
			match[0],
		));
	}
	return findings;
}

function findIdenticalTernaryBranches(context) {
	const findings = [];
	for (const candidate of ternaryCandidates(context.stripped)) {
		const trueBranch = normalizeExpression(context.source.slice(candidate.trueStart, candidate.colon));
		const falseBranch = normalizeExpression(context.source.slice(candidate.falseStart, candidate.end));
		if (trueBranch.length === 0 || falseBranch.length === 0) continue;
		if (trueBranch !== falseBranch) continue;
		findings.push(finding(
			context,
			candidate.question,
			"error",
			"identical-ternary-branches",
			"Ternary condition does not change the result; delete the dead predicate or restore the missing behavior.",
			context.source.slice(candidate.question, candidate.end),
		));
	}
	return findings;
}

function ternaryCandidates(text) {
	const candidates = [];
	for (let index = 0; index < text.length; index += 1) {
		if (text[index] !== "?") continue;
		if (text[index + 1] === "?" || text[index + 1] === "." || text[index - 1] === "?") continue;
		const colon = findMatchingTernaryColon(text, index + 1);
		if (colon === -1) continue;
		const end = findExpressionEnd(text, colon + 1);
		if (end === -1) continue;
		candidates.push({ question: index, trueStart: index + 1, colon, falseStart: colon + 1, end });
	}
	return candidates;
}

function findMatchingTernaryColon(text, start) {
	let paren = 0;
	let bracket = 0;
	let brace = 0;
	let nestedTernaries = 0;
	for (let index = start; index < text.length; index += 1) {
		const char = text[index];
		if (char === "(" || char === "[" || char === "{") {
			if (char === "(") paren += 1;
			if (char === "[") bracket += 1;
			if (char === "{") brace += 1;
			continue;
		}
		if (char === ")" || char === "]" || char === "}") {
			if (char === ")") paren = Math.max(0, paren - 1);
			if (char === "]") bracket = Math.max(0, bracket - 1);
			if (char === "}") brace = Math.max(0, brace - 1);
			continue;
		}
		if (paren !== 0 || bracket !== 0 || brace !== 0) continue;
		if (char === "?" && text[index + 1] !== "?" && text[index + 1] !== ".") nestedTernaries += 1;
		if (char === ":") {
			if (nestedTernaries > 0) nestedTernaries -= 1;
			else return index;
		}
		if (char === ";") return -1;
	}
	return -1;
}

function findExpressionEnd(text, start) {
	let paren = 0;
	let bracket = 0;
	let brace = 0;
	for (let index = start; index < text.length; index += 1) {
		const char = text[index];
		if (char === "(") paren += 1;
		else if (char === "[") bracket += 1;
		else if (char === "{") brace += 1;
		else if (char === ")") {
			if (paren === 0) return index;
			paren -= 1;
		} else if (char === "]") {
			if (bracket === 0) return index;
			bracket -= 1;
		} else if (char === "}") {
			if (brace === 0) return index;
			brace -= 1;
		} else if ((char === ";" || char === "\n") && paren === 0 && bracket === 0 && brace === 0) return index;
	}
	return text.length;
}

function normalizeExpression(value) {
	let normalized = value.replace(/\s+/g, "").replace(/,$/, "");
	while (normalized.startsWith("(") && normalized.endsWith(")")) normalized = normalized.slice(1, -1);
	return normalized;
}

function findIdenticalIfElseBranches(context) {
	const findings = [];
	const blockPattern = /\bif\s*\([^)]{1,300}\)\s*\{([^{}]{1,500})\}\s*else\s*\{([^{}]{1,500})\}/gd;
	for (const match of context.stripped.matchAll(blockPattern)) {
		const leftRange = match.indices?.[1];
		const rightRange = match.indices?.[2];
		if (!leftRange || !rightRange) continue;
		const left = normalizeBlock(context.source.slice(leftRange[0], leftRange[1]));
		const right = normalizeBlock(context.source.slice(rightRange[0], rightRange[1]));
		if (left.length === 0 || left !== right) continue;
		const matchRange = match.indices?.[0];
		findings.push(finding(
			context,
			match.index ?? 0,
			"error",
			"identical-if-else-branches",
			"If/else branches normalize identically; the condition is refactor residue unless a side effect is missing.",
			matchRange ? context.source.slice(matchRange[0], matchRange[1]) : match[0],
		));
	}
	const statementPattern = /\bif\s*\([^)]{1,300}\)\s*([^{};\n]{1,240};)\s*else\s*([^{};\n]{1,240};)/gd;
	for (const match of context.stripped.matchAll(statementPattern)) {
		const leftRange = match.indices?.[1];
		const rightRange = match.indices?.[2];
		if (!leftRange || !rightRange) continue;
		const left = normalizeBlock(context.source.slice(leftRange[0], leftRange[1]));
		const right = normalizeBlock(context.source.slice(rightRange[0], rightRange[1]));
		if (left.length === 0 || left !== right) continue;
		const matchRange = match.indices?.[0];
		findings.push(finding(
			context,
			match.index ?? 0,
			"error",
			"identical-if-else-branches",
			"If/else statements normalize identically; delete the dead predicate or restore the missing behavior.",
			matchRange ? context.source.slice(matchRange[0], matchRange[1]) : match[0],
		));
	}
	return findings;
}

function normalizeBlock(value) {
	return value.replace(/\s+/g, "").replace(/;+$/g, "");
}

function findLongPositionalParameterLists(context) {
	const findings = [];
	const seen = new Set();
	const patterns = [
		/\b(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]{0,800})\)/gd,
		/\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(([^)]{0,800})\)\s*=>/gd,
	];
	for (const pattern of patterns) {
		for (const match of context.stripped.matchAll(pattern)) {
			const name = match[1];
			const params = match[2];
			const count = countTopLevelParameters(params);
			if (count < 5) continue;
			const index = match.index ?? 0;
			const key = `${index}:${name}`;
			if (seen.has(key)) continue;
			seen.add(key);
			findings.push(finding(
				context,
				index,
				"warning",
				"long-positional-params",
				`Function '${name}' has ${count} positional parameters; prefer a named options/deps object when this is wiring or orchestration code.`,
				lineAt(context.source, index),
			));
		}
	}
	return findings;
}

function countTopLevelParameters(params) {
	const trimmed = params.trim();
	if (trimmed.length === 0) return 0;
	let paren = 0;
	let bracket = 0;
	let brace = 0;
	let count = 1;
	for (let index = 0; index < trimmed.length; index += 1) {
		const char = trimmed[index];
		if (char === "(") paren += 1;
		else if (char === "[") bracket += 1;
		else if (char === "{") brace += 1;
		else if (char === ")") paren = Math.max(0, paren - 1);
		else if (char === "]") bracket = Math.max(0, bracket - 1);
		else if (char === "}") brace = Math.max(0, brace - 1);
		else if (char === "," && paren === 0 && bracket === 0 && brace === 0) count += 1;
	}
	return count;
}

function findBareDelays(context) {
	const findings = [];
	const pattern = /\b(setTimeout|setInterval)\s*\([^,]+,\s*(\d{2,})\b/g;
	for (const match of context.stripped.matchAll(pattern)) {
		findings.push(finding(
			context,
			match.index ?? 0,
			"warning",
			"bare-delay",
			"Bare delay literal hides units and intent; use a named *_MS constant unless this is a local test fixture.",
			match[0],
		));
	}
	return findings;
}

function findNonNullAssertions(context) {
	const findings = [];
	const pattern = /\b[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\[[^\]\n]{1,80}\])*!\s*(?=[).,;:\]\}\n])/g;
	for (const match of context.stripped.matchAll(pattern)) {
		const index = match.index ?? 0;
		if (context.stripped[index - 1] === "!" || context.stripped[index + match[0].length] === "=") continue;
		findings.push(finding(
			context,
			index,
			"lead",
			"non-null-assertion",
			"Review non-null assertion: prefer a guard, narrowing branch, or checked helper that proves the invariant.",
			match[0],
		));
	}
	return findings;
}

function findOptionalCallAssumptions(context) {
	const findings = [];
	const sourceLines = context.source.split("\n");
	const strippedLines = context.stripped.split("\n");
	let absoluteIndex = 0;
	for (let lineIndex = 0; lineIndex < strippedLines.length; lineIndex += 1) {
		const line = strippedLines[lineIndex];
		const optionalCallColumn = line.indexOf("?.(");
		if (optionalCallColumn !== -1) {
			const window = strippedLines.slice(lineIndex, lineIndex + 3).join("\n");
			const riskyFollowUp = /\b(console\.|log\s*\(|return\b|persist|save|sync|schedule|cancel|emit|set[A-Z]|update[A-Z]?)/.test(window);
			if (riskyFollowUp) {
				findings.push(finding(
					context,
					absoluteIndex + optionalCallColumn,
					"lead",
					"optional-call-assumed",
					"Side-effectful optional call is near code that may assume it ran; verify skipped callbacks do not produce misleading success state.",
					sourceLines.slice(lineIndex, lineIndex + 3).join(" "),
				));
			}
		}
		absoluteIndex += sourceLines[lineIndex].length + 1;
	}
	return findings;
}

function renderFindings(result, options) {
	const reportableFindings = filterByMinimumSeverity(result.findings, options.reportMin);
	const findings = options.maxFindings === undefined ? reportableFindings : reportableFindings.slice(0, options.maxFindings);
	const truncated = reportableFindings.length - findings.length;
	if (options.format === "json") {
		console.log(JSON.stringify({ ...result, findings, totalFindings: result.findings.length, reportedFindings: reportableFindings.length, truncated }, null, 2));
		return;
	}
	if (options.format === "text") {
		console.log(`${result.status}: ${result.findings.length} finding(s), ${reportableFindings.length} reported, ${result.files} TypeScript file(s) scanned`);
		for (const item of findings) {
			console.log(`${item.severity} ${item.check} ${item.path}:${item.line}:${item.column} - ${item.message}`);
			if (item.snippet) console.log(`  ${item.snippet}`);
		}
		if (truncated > 0) console.log(`... ${truncated} finding(s) truncated; rerun without --max-findings`);
		return;
	}
	renderToon(result, findings, reportableFindings.length, truncated);
}

function filterByMinimumSeverity(findings, minimum) {
	const threshold = SEVERITY_RANK.get(minimum) ?? SEVERITY_RANK.get(DEFAULT_REPORT_MIN);
	if (threshold === 0) return [];
	return findings.filter((item) => (SEVERITY_RANK.get(item.severity) ?? 0) >= threshold);
}

function renderToon(result, findings, reportedFindings, truncated) {
	console.log("deslop_ts_scan:");
	console.log(`  status: ${result.status}`);
	console.log(`  files: ${result.files}`);
	console.log(`  findings: ${result.findings.length}`);
	console.log(`  reported: ${reportedFindings}`);
	console.log(`  fail_on: ${result.failOn}`);
	console.log(`  report_min: ${result.reportMin}`);
	if (findings.length === 0) {
		console.log("findings: 0 findings found for selected severity checks");
	} else {
		console.log(`findings[${findings.length}]{severity,check,path,line,column,message}:`);
		for (const item of findings) {
			console.log(`  ${toonValue(item.severity)},${toonValue(item.check)},${toonValue(item.path)},${item.line},${item.column},${toonValue(item.message)}`);
		}
		console.log(`snippets[${findings.length}]{path,line,snippet}:`);
		for (const item of findings) console.log(`  ${toonValue(item.path)},${item.line},${toonValue(item.snippet)}`);
	}
	if (truncated > 0) {
		console.log("help[1]:");
		console.log(`  ${toonValue(`${truncated} finding(s) truncated; rerun without --max-findings`)}`);
	}
}

function toonValue(value) {
	const stringValue = String(value);
	if (/^[A-Za-z0-9_./:@+-]+$/.test(stringValue)) return stringValue;
	return JSON.stringify(stringValue);
}

function shouldFail(findings, failOn) {
	const threshold = SEVERITY_RANK.get(failOn) ?? SEVERITY_RANK.get(DEFAULT_FAIL_ON);
	if (threshold === 0) return false;
	return findings.some((item) => (SEVERITY_RANK.get(item.severity) ?? 0) >= threshold);
}

function main() {
	try {
		const options = parseArgs(process.argv.slice(2));
		if (options.help) {
			printHelp();
			return 0;
		}
		const cwd = process.cwd();
		const files = collectTypeScriptFiles(options.paths, cwd);
		const findings = files.flatMap((file) => analyzeFile(file, cwd));
		findings.sort((left, right) => left.path.localeCompare(right.path) || left.line - right.line || left.column - right.column || left.check.localeCompare(right.check));
		const fail = shouldFail(findings, options.failOn);
		renderFindings({ status: fail ? "fail" : "pass", files: files.length, findings, failOn: options.failOn, reportMin: options.reportMin, tool: path.relative(cwd, fileURLToPath(import.meta.url)) }, options);
		return fail ? 1 : 0;
	} catch (error) {
		if (error instanceof UsageError) {
			console.log("error: usage");
			console.log(`message: ${error.message}`);
			console.log("help: node scripts/typescript/deslop-ts-scan.mjs --help");
			return 2;
		}
		console.log("error: deslop-ts-scan failed");
		console.log(`message: ${error instanceof Error ? error.message : String(error)}`);
		return 1;
	}
}

process.exitCode = main();
