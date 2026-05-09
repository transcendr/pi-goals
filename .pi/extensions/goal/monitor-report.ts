import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
	GOAL_MONITOR_ENTRY_SUMMARY_CHARS,
	GOAL_MONITOR_RECENT_BRANCH_ENTRY_LIMIT,
	GOAL_MONITOR_RECENT_LOG_LIMIT,
} from "./constants";
import { getLastMonitorReportAt, getRecentMonitorLogs, noteMonitorReportSent } from "./monitor-state";
import type { GoalMonitorRecentEntry, GoalMonitorReport, GoalState, GoalTelemetrySnapshot } from "./types";

export function buildGoalMonitorReport(ctx: ExtensionContext, goal: GoalState, telemetry: GoalTelemetrySnapshot | null, now = Date.now()): GoalMonitorReport {
	const lastSentAt = getLastMonitorReportAt(goal.goalId);
	const branch = ctx.sessionManager.getBranch();
	noteMonitorReportSent(goal.goalId, now);
	return {
		version: 1,
		reportId: crypto.randomUUID(),
		goalId: goal.goalId,
		sentAt: now,
		elapsedSinceGoalStartSeconds: Math.max(0, Math.floor((now - goal.createdAt) / 1000)),
		elapsedSincePreviousReportSeconds: lastSentAt === undefined ? undefined : Math.max(0, Math.floor((now - lastSentAt) / 1000)),
		goal,
		telemetry,
		session: {
			cwd: ctx.cwd,
			sessionId: ctx.sessionManager.getSessionId(),
			branchEntryCount: branch.length,
		},
		recentEntries: recentBranchEntries(branch),
		recentLogEntries: getRecentMonitorLogs(goal.goalId, GOAL_MONITOR_RECENT_LOG_LIMIT),
	};
}

function recentBranchEntries(branch: unknown[]): GoalMonitorRecentEntry[] {
	const start = Math.max(0, branch.length - GOAL_MONITOR_RECENT_BRANCH_ENTRY_LIMIT);
	return branch.slice(start).map((entry, offset) => summarizeEntry(entry, start + offset));
}

function summarizeEntry(entry: unknown, index: number): GoalMonitorRecentEntry {
	if (typeof entry !== "object" || entry === null) return { index, type: typeof entry, summary: String(entry).slice(0, GOAL_MONITOR_ENTRY_SUMMARY_CHARS) };
	const candidate = entry as Record<string, unknown>;
	const message = typeof candidate.message === "object" && candidate.message !== null ? candidate.message as Record<string, unknown> : undefined;
	if (message) return summarizeMessageEntry(candidate, message, index);
	const summary = textFromEntry(candidate);
	return { index, type: stringField(candidate.type, "entry"), timestamp: candidate.timestamp as string | number | undefined, summary: trimSummary(summary) };
}

function summarizeMessageEntry(entry: Record<string, unknown>, message: Record<string, unknown>, index: number): GoalMonitorRecentEntry {
	const role = stringField(message.role, "message");
	const summary = trimSummary(textFromMessage(message));
	return {
		index,
		type: stringField(entry.type, "message"),
		role,
		timestamp: entry.timestamp as string | number | undefined,
		toolName: typeof message.toolName === "string" ? message.toolName : undefined,
		isError: typeof message.isError === "boolean" ? message.isError : undefined,
		summary,
	};
}

function textFromEntry(entry: Record<string, unknown>): string {
	if (typeof entry.summary === "string") return entry.summary;
	if (typeof entry.customType === "string") return `custom:${entry.customType}`;
	if (typeof entry.modelId === "string") return `model:${entry.modelId}`;
	return stringField(entry.type, "entry");
}

function textFromMessage(message: Record<string, unknown>): string {
	if (typeof message.content === "string") return message.content;
	if (Array.isArray(message.content)) return message.content.map(textFromContentBlock).filter(Boolean).join("\n");
	if (typeof message.command === "string") return `${message.command}\n${typeof message.output === "string" ? message.output : ""}`;
	if (typeof message.summary === "string") return message.summary;
	return stringField(message.role, "message");
}

function textFromContentBlock(block: unknown): string {
	if (typeof block !== "object" || block === null) return "";
	const candidate = block as Record<string, unknown>;
	if (typeof candidate.text === "string") return candidate.text;
	if (typeof candidate.thinking === "string") return "[thinking omitted]";
	if (candidate.type === "toolCall") return `tool call: ${stringField(candidate.name, "unknown")}`;
	if (candidate.type === "image") return "[image]";
	return "";
}

function trimSummary(value: string): string {
	const normalized = value.replace(/\s+/g, " ").trim();
	return normalized.length > GOAL_MONITOR_ENTRY_SUMMARY_CHARS ? `${normalized.slice(0, GOAL_MONITOR_ENTRY_SUMMARY_CHARS)}…` : normalized;
}

function stringField(value: unknown, fallback: string): string {
	return typeof value === "string" ? value : fallback;
}
