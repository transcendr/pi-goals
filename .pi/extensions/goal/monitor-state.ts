import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { GOAL_MONITOR_LOG_ENTRY_TYPE, GOAL_MONITOR_RECENT_LOG_LIMIT } from "./constants";
import type { GoalMonitorDecision, GoalMonitorLogEntry } from "./types";

let logEntries: GoalMonitorLogEntry[] = [];
let lastReportSentAt = new Map<string, number>();

export function replayGoalMonitorLogs(ctx: ExtensionContext): void {
	const next: GoalMonitorLogEntry[] = [];
	for (const entry of ctx.sessionManager.getBranch()) {
		const log = entryToMonitorLog(entry);
		if (log) next.push(log);
	}
	logEntries = next;
	lastReportSentAt = new Map();
	for (const entry of next) lastReportSentAt.set(entry.goalId, entry.at);
}

export function getRecentMonitorLogs(goalId: string, limit = GOAL_MONITOR_RECENT_LOG_LIMIT): GoalMonitorLogEntry[] {
	return logEntries.filter((entry) => entry.goalId === goalId).slice(-Math.max(0, limit));
}

export function getLastMonitorReportAt(goalId: string): number | undefined {
	return lastReportSentAt.get(goalId);
}

export function noteMonitorReportSent(goalId: string, sentAt: number): void {
	lastReportSentAt.set(goalId, sentAt);
}

export function persistMonitorDecisionLog(
	pi: ExtensionAPI,
	goalId: string,
	reportId: string,
	decision: GoalMonitorDecision,
	steerInjected: boolean,
	now = Date.now(),
): GoalMonitorLogEntry {
	const entry: GoalMonitorLogEntry = {
		version: 1,
		goalId,
		reportId,
		decisionId: crypto.randomUUID(),
		at: now,
		action: decision.action,
		confidence: decision.confidence,
		pattern: decision.pattern,
		evidenceSummary: decision.evidence.join(" | ").slice(0, 1000),
		steerInjected,
		logNote: decision.logNote,
	};
	pi.appendEntry(GOAL_MONITOR_LOG_ENTRY_TYPE, entry);
	logEntries.push(entry);
	return entry;
}

export function resetGoalMonitorLogRuntime(): void {
	logEntries = [];
	lastReportSentAt = new Map();
}

function entryToMonitorLog(entry: unknown): GoalMonitorLogEntry | null {
	if (typeof entry !== "object" || entry === null) return null;
	const candidate = entry as Record<string, unknown>;
	if (candidate.type !== "custom" || candidate.customType !== GOAL_MONITOR_LOG_ENTRY_TYPE) return null;
	return isMonitorLogEntry(candidate.data) ? candidate.data : null;
}

function isMonitorLogEntry(value: unknown): value is GoalMonitorLogEntry {
	if (typeof value !== "object" || value === null) return false;
	const v = value as Record<string, unknown>;
	return v.version === 1 && typeof v.goalId === "string" && typeof v.reportId === "string" && typeof v.decisionId === "string" && typeof v.at === "number" && isAction(v.action);
}

function isAction(value: unknown): boolean {
	return value === "watch" || value === "steer" || value === "escalate";
}
