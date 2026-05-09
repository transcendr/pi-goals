import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { CHURN_STEER_MESSAGE_TYPE, CHURN_MONITOR_PROMPT_ID } from "./constants";
import { getGoal, getTelemetry } from "./state";
import { notifyInfo, notifyWarning } from "./ui";
import type { GoalState, GoalTelemetrySnapshot, GoalSteeringDetails } from "./types";

const RUNTIME_DIR = ".pi-goal-churn";
const SESSION_DIR = "sessions";
const LOG_FILE = "churn-log.jsonl";
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_COOLDOWN_SECONDS = 300;
const REPORT_ENTRY_LIMIT = 10;

type ChurnConfidence = "low" | "medium" | "high";
type ChurnAction = "none" | "watch" | "steer" | "pause" | "escalate";

export type ChurnMonitorDecision = {
	churn: boolean;
	confidence: ChurnConfidence;
	pattern?: string;
	evidence?: string[];
	steer?: string;
	recommended_action: ChurnAction;
	cooldown_seconds?: number;
};

type ChurnLogEntry = {
	at: number;
	goalId: string;
	decision: ChurnMonitorDecision;
};

export async function runChurnMonitor(pi: ExtensionAPI, ctx: ExtensionContext): Promise<void> {
	const goal = runnableGoal(ctx);
	if (!goal) return;
	const telemetry = getTelemetry();
	const log = recentChurnLog(goal.goalId);
	if (!shouldRequestAutomaticReview(telemetry, log)) return;
	try {
		handleMonitorDecision(pi, ctx, goal, requestMonitorDecision(ctx, goal, telemetry, log));
	} catch (error) {
		notifyWarning(ctx, `Churn monitor failed: ${errorMessage(error)}`);
	}
}

function runnableGoal(ctx: ExtensionContext): GoalState | null {
	const goal = getGoal();
	if (!goal) {
		notifyInfo(ctx, "No goal is currently set.");
		return null;
	}
	if (goal.status !== "active") {
		notifyInfo(ctx, `Churn monitor skipped: goal is ${goal.status}.`);
		return null;
	}
	return goal;
}

function requestMonitorDecision(ctx: ExtensionContext, goal: GoalState, telemetry: GoalTelemetrySnapshot | null, log: ChurnLogEntry[]): ChurnMonitorDecision {
	const prompt = buildChurnMonitorPrompt(goal, telemetry, compactBranchReport(ctx), log);
	const decision = parseMonitorOutput(invokeMonitorAgent(goal, prompt));
	appendChurnLog(goal.goalId, decision);
	return decision;
}

function handleMonitorDecision(pi: ExtensionAPI, ctx: ExtensionContext, goal: GoalState, decision: ChurnMonitorDecision): void {
	if (shouldInjectSteer(decision)) {
		injectChurnSteer(pi, goal, decision);
		notifyWarning(ctx, `Churn monitor steering injected: ${decision.pattern ?? "possible churn"}.`);
		return;
	}
	notifyInfo(ctx, `Churn monitor: ${decision.churn ? "watching possible churn" : "no steer recommended"}.`);
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function buildChurnMonitorPrompt(
	goal: GoalState,
	telemetry: GoalTelemetrySnapshot | null,
	recentReport: string,
	log: ChurnLogEntry[],
): string {
	return `You are the persistent third-party churn monitor for one pi-goal. You are not the worker. Your job is to judge whether the worker is visibly stuck in an unproductive loop and, only when justified, provide one narrow steering instruction.

Be patient. Do not steer merely because the goal is long-running, hard, or has failed once. Require identifiable churn: repeated bad strategy, irrelevant artifact fixation, unsupported assumption loop, complexity escalation, evidence-blind retry, validation tunnel vision, scope drift, thrash, or user-escalation-needed.

If steering is needed, make it contextually relevant and universally useful: tell the worker what to stop doing, what first-principles framing to use, and the single simplest next action likely to unblock progress. Do not solve the task yourself. Do not mark the goal complete. Do not request broad rewrites.

Trigger: automatic lifecycle check
Time now: ${new Date().toISOString()}

Goal state:
${JSON.stringify(goal, null, 2)}

Telemetry:
${JSON.stringify(telemetry, null, 2)}

Recent churn log:
${JSON.stringify(log, null, 2)}

Sparse recent session report:
${recentReport}

Return only JSON with this shape:
{"churn":false,"confidence":"low","pattern":"","evidence":[],"steer":"","recommended_action":"none","cooldown_seconds":120}

Use recommended_action "steer" only for real medium/high-confidence churn. Use "watch" for weak signals. Use "escalate" for missing user decisions. Keep steer under 900 characters.`;
}

export function parseMonitorOutput(output: string): ChurnMonitorDecision {
	const json = extractJson(output);
	const parsed = JSON.parse(json) as Record<string, unknown>;
	const confidence = parseConfidence(parsed.confidence);
	const action = parseAction(parsed.recommended_action);
	return {
		churn: parsed.churn === true,
		confidence,
		pattern: typeof parsed.pattern === "string" ? parsed.pattern : undefined,
		evidence: Array.isArray(parsed.evidence) ? parsed.evidence.filter((item): item is string => typeof item === "string").slice(0, 6) : [],
		steer: typeof parsed.steer === "string" ? parsed.steer.slice(0, 1200) : undefined,
		recommended_action: action,
		cooldown_seconds: typeof parsed.cooldown_seconds === "number" ? Math.max(0, Math.floor(parsed.cooldown_seconds)) : undefined,
	};
}

export function shouldInjectSteer(decision: ChurnMonitorDecision): boolean {
	return decision.churn && decision.recommended_action === "steer" && (decision.confidence === "medium" || decision.confidence === "high") && Boolean(decision.steer?.trim());
}

export function shouldRequestAutomaticReview(telemetry: GoalTelemetrySnapshot | null, log: ChurnLogEntry[] = [], now = Date.now()): boolean {
	if (!telemetry) return false;
	if (!churnSignalsAreStrongEnough(telemetry)) return false;
	const latest = log.at(-1);
	return !latest || now - latest.at >= cooldownMs(latest.decision);
}

function churnSignalsAreStrongEnough(telemetry: GoalTelemetrySnapshot): boolean {
	return telemetry.consecutiveNoProgressTurns >= 2 || telemetry.consecutiveAutoTurns >= 8;
}

function cooldownMs(decision: ChurnMonitorDecision): number {
	return Math.max(DEFAULT_COOLDOWN_SECONDS, decision.cooldown_seconds ?? DEFAULT_COOLDOWN_SECONDS) * 1000;
}

function invokeMonitorAgent(goal: GoalState, prompt: string): string {
	const runtime = runtimeDir();
	mkdirSync(join(runtime, SESSION_DIR), { recursive: true });
	return execFileSync("pi", ["--session-dir", join(runtime, SESSION_DIR), "--session", `churn-${goal.goalId}`, "--no-tools", "--no-context-files", "-p", prompt], {
		cwd: process.cwd(),
		encoding: "utf8",
		timeout: DEFAULT_TIMEOUT_MS,
		maxBuffer: 80_000,
	});
}

function injectChurnSteer(pi: ExtensionAPI, goal: GoalState, decision: ChurnMonitorDecision): void {
	const details: GoalSteeringDetails = { goalId: goal.goalId, kind: "churnSteer", promptId: CHURN_MONITOR_PROMPT_ID, createdAt: Date.now() };
	pi.sendMessage(
		{ customType: CHURN_STEER_MESSAGE_TYPE, content: buildSteerContent(goal, decision), display: false, details },
		{ deliverAs: "steer" },
	);
}

function buildSteerContent(goal: GoalState, decision: ChurnMonitorDecision): string {
	return `Churn monitor steering for active pi-goal ${goal.goalId}.

Pattern: ${decision.pattern ?? "possible churn"}
Evidence:
${(decision.evidence ?? []).map((item) => `- ${item}`).join("\n") || "- monitor judged current trajectory needs correction"}

Steer:
${decision.steer}

Before doing more work, step back from the current path. Reconsider the objective from first principles and take the single simplest concrete action that can unblock progress. If get_goal reports this goal is paused, absent, complete, budget-limited, or has a different goal id, ignore this stale steering.`;
}

function compactBranchReport(ctx: ExtensionContext): string {
	const branch = ctx.sessionManager.getBranch().slice(-REPORT_ENTRY_LIMIT);
	return branch.map((entry, index) => `${index + 1}. ${summarizeEntry(entry)}`).join("\n");
}

function summarizeEntry(entry: unknown): string {
	if (typeof entry !== "object" || entry === null) return String(entry).slice(0, 200);
	const record = entry as Record<string, unknown>;
	const type = String(record.type ?? "entry");
	const message = typeof record.message === "object" && record.message !== null ? (record.message as Record<string, unknown>) : record;
	const role = typeof message.role === "string" ? message.role : "";
	const content = typeof message.content === "string" ? message.content : typeof record.content === "string" ? record.content : "";
	return `${type}${role ? `/${role}` : ""}: ${content.replace(/\s+/g, " ").slice(0, 500)}`;
}

function appendChurnLog(goalId: string, decision: ChurnMonitorDecision): void {
	mkdirSync(runtimeDir(), { recursive: true });
	appendFileSync(logPath(), `${JSON.stringify({ at: Date.now(), goalId, decision })}\n`);
}

function recentChurnLog(goalId: string): ChurnLogEntry[] {
	try {
		return readFileSync(logPath(), "utf8")
			.split(/\r?\n/)
			.filter(Boolean)
			.map((line) => JSON.parse(line) as ChurnLogEntry)
			.filter((entry) => entry.goalId === goalId)
			.slice(-5);
	} catch {
		return [];
	}
}

function runtimeDir(): string {
	return join(process.cwd(), RUNTIME_DIR);
}

function logPath(): string {
	return join(runtimeDir(), LOG_FILE);
}

function extractJson(output: string): string {
	const start = output.indexOf("{");
	const end = output.lastIndexOf("}");
	if (start < 0 || end <= start) throw new Error("monitor output did not contain JSON");
	return output.slice(start, end + 1);
}

function parseConfidence(value: unknown): ChurnConfidence {
	return value === "medium" || value === "high" ? value : "low";
}

function parseAction(value: unknown): ChurnAction {
	return value === "watch" || value === "steer" || value === "pause" || value === "escalate" ? value : "none";
}
