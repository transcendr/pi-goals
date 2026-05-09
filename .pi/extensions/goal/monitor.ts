import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
	GOAL_MONITOR_MESSAGE_TYPE,
	GOAL_MONITOR_OUTPUT_CHARS,
	GOAL_MONITOR_PROCESS_TIMEOUT_MS,
	GOAL_MONITOR_REPORT_INTERVAL_SECONDS,
} from "./constants";
import { extractXmlPayload, readXmlTag, readXmlTags, requireXmlTag } from "./model-output";
import { buildGoalMonitorPrompt, buildGoalMonitorSteerPrompt } from "./monitor-prompts";
import { buildGoalMonitorReport } from "./monitor-report";
import { persistMonitorDecisionLog, replayGoalMonitorLogs, resetGoalMonitorLogRuntime } from "./monitor-state";
import { getGoal, getTelemetry } from "./state";
import { notifyWarning } from "./ui";
import type { GoalMonitorConfidence, GoalMonitorDecision, GoalMonitorReport } from "./types";

const DECISION_ROOT = "churn_monitor_decision";

type PendingMonitor = {
	goalId: string;
	timer: ReturnType<typeof setTimeout>;
};

let pendingMonitor: PendingMonitor | undefined;

export function scheduleGoalMonitor(pi: ExtensionAPI, ctx: ExtensionContext): void {
	const goal = getGoal();
	if (!goal || goal.status !== "active") {
		cancelGoalMonitor(goal?.goalId, "inactive");
		return;
	}
	if (pendingMonitor?.goalId === goal.goalId) return;
	cancelGoalMonitor(undefined, "reschedule");
	const timer = setTimeout(() => void safelyRun(() => runMonitorCycle(pi, ctx, goal.goalId)), 25);
	pendingMonitor = { goalId: goal.goalId, timer };
}

export function cancelGoalMonitor(goalId?: string, _reason = "cancelled"): void {
	if (!pendingMonitor || (goalId && pendingMonitor.goalId !== goalId)) return;
	clearTimeout(pendingMonitor.timer);
	pendingMonitor = undefined;
}

export function replayGoalMonitorState(ctx: ExtensionContext): void {
	replayGoalMonitorLogs(ctx);
}

export function resetGoalMonitorRuntime(): void {
	cancelGoalMonitor();
	resetGoalMonitorLogRuntime();
}

export function parseGoalMonitorDecision(output: string): { ok: true; decision: GoalMonitorDecision } | { ok: false; error: string; warnings: string[] } {
	const extraction = extractXmlPayload(output.slice(0, GOAL_MONITOR_OUTPUT_CHARS), DECISION_ROOT);
	if (!extraction.ok) return extraction;
	const action = requireXmlTag(extraction.xml, "action");
	if (!action.ok) return { ok: false, error: action.error, warnings: extraction.warnings };
	const normalizedAction = action.value.trim();
	if (normalizedAction !== "watch" && normalizedAction !== "steer" && normalizedAction !== "escalate") {
		return { ok: false, error: `Invalid monitor action: ${normalizedAction}.`, warnings: extraction.warnings };
	}
	const steer = readXmlTag(extraction.xml, "steer")?.trim();
	if (normalizedAction === "steer" && !steer) return { ok: false, error: "Monitor action steer requires a non-empty <steer> tag.", warnings: extraction.warnings };
	return {
		ok: true,
		decision: {
			action: normalizedAction,
			confidence: parseConfidence(readXmlTag(extraction.xml, "confidence")),
			pattern: optionalText(readXmlTag(extraction.xml, "pattern")),
			evidence: readXmlTags(extraction.xml, "evidence").map((item) => item.trim()).filter(Boolean),
			steer,
			logNote: readXmlTag(extraction.xml, "log_note")?.trim() ?? "",
			parseWarnings: extraction.warnings,
		},
	};
}

async function runMonitorCycle(pi: ExtensionAPI, ctx: ExtensionContext, goalId: string): Promise<void> {
	const current = getGoal();
	if (!current || current.goalId !== goalId || current.status !== "active") {
		cancelGoalMonitor(goalId, "inactive");
		return;
	}
	const report = buildGoalMonitorReport(ctx, current, getTelemetry());
	try {
		const output = await invokeMonitorAgent(pi, ctx, report);
		await handleMonitorOutput(pi, ctx, report, output);
	} finally {
		scheduleNextMonitorCycle(pi, ctx, goalId);
	}
}

async function invokeMonitorAgent(pi: ExtensionAPI, ctx: ExtensionContext, report: GoalMonitorReport): Promise<string> {
	const sessionPath = monitorSessionPath(ctx.cwd, report.goalId);
	mkdirSync(join(ctx.cwd, ".pi", "goal-monitor", "sessions"), { recursive: true });
	const prompt = buildGoalMonitorPrompt(report);
	const result = await pi.exec("pi", [
		"--session", sessionPath,
		"--no-tools",
		"--no-context-files",
		"--no-extensions",
		"--no-skills",
		"--no-prompt-templates",
		"--print",
		prompt,
	], { cwd: ctx.cwd, timeout: GOAL_MONITOR_PROCESS_TIMEOUT_MS });
	const combined = [result.stdout, result.stderr].filter(Boolean).join("\n").slice(0, GOAL_MONITOR_OUTPUT_CHARS);
	if (result.code !== 0) throw new Error(`monitor exited ${result.code}: ${combined}`);
	return combined;
}

async function handleMonitorOutput(pi: ExtensionAPI, ctx: ExtensionContext, report: GoalMonitorReport, output: string): Promise<void> {
	const parsed = parseGoalMonitorDecision(output);
	if (!parsed.ok) {
		persistMonitorDecisionLog(pi, report.goalId, report.reportId, parseErrorDecision(parsed), false);
		console.warn(`[pi-goal] monitor parse failed: ${parsed.error}`);
		return;
	}
	const steerInjected = shouldAcceptDecision(report) && parsed.decision.action === "steer" && Boolean(parsed.decision.steer);
	persistMonitorDecisionLog(pi, report.goalId, report.reportId, parsed.decision, steerInjected);
	if (!shouldAcceptDecision(report)) return;
	if (parsed.decision.action === "steer" && parsed.decision.steer) injectMonitorSteer(pi, report, parsed.decision.steer);
	if (parsed.decision.action === "escalate") notifyWarning(ctx, monitorEscalationText(parsed.decision));
}

function injectMonitorSteer(pi: ExtensionAPI, report: GoalMonitorReport, steer: string): void {
	pi.sendMessage(
		{
			customType: GOAL_MONITOR_MESSAGE_TYPE,
			content: buildGoalMonitorSteerPrompt(report, steer),
			display: false,
			details: { goalId: report.goalId, kind: "monitorSteer", promptId: report.reportId, createdAt: Date.now(), reportId: report.reportId },
		},
		{ deliverAs: "steer" },
	);
}

function scheduleNextMonitorCycle(pi: ExtensionAPI, ctx: ExtensionContext, goalId: string): void {
	const current = getGoal();
	if (!current || current.goalId !== goalId || current.status !== "active") {
		cancelGoalMonitor(goalId, "inactive");
		return;
	}
	const timer = setTimeout(() => void safelyRun(() => runMonitorCycle(pi, ctx, goalId)), GOAL_MONITOR_REPORT_INTERVAL_SECONDS * 1000);
	pendingMonitor = { goalId, timer };
}

function shouldAcceptDecision(report: GoalMonitorReport): boolean {
	const current = getGoal();
	return Boolean(current && current.goalId === report.goalId && current.status === "active");
}

function parseErrorDecision(parsed: { error: string; warnings: string[] }): GoalMonitorDecision {
	return {
		action: "watch",
		confidence: "low",
		pattern: "monitor_parse_error",
		evidence: [parsed.error, ...parsed.warnings],
		logNote: "Monitor output could not be parsed; no steering injected.",
		parseWarnings: parsed.warnings,
	};
}

function parseConfidence(value: string | undefined): GoalMonitorConfidence {
	const normalized = value?.trim();
	return normalized === "medium" || normalized === "high" ? normalized : "low";
}

function optionalText(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed && trimmed !== "none" ? trimmed : undefined;
}

function monitorEscalationText(decision: GoalMonitorDecision): string {
	const evidence = decision.evidence.length ? `\nEvidence: ${decision.evidence.join("; ")}` : "";
	return `Goal monitor recommends user input or an external decision.${evidence}\n${decision.logNote}`.trim();
}

function monitorSessionPath(cwd: string, goalId: string): string {
	return join(cwd, ".pi", "goal-monitor", "sessions", `pi-goal-monitor-${goalId}.jsonl`);
}

async function safelyRun(task: () => Promise<void>): Promise<void> {
	try {
		await task();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.warn(`[pi-goal] monitor failed: ${message}`);
	}
}
