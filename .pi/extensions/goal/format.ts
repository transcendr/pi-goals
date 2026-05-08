import { GOAL_USAGE, GOAL_USAGE_HINT, LONG_OBJECTIVE_HINT, MAX_OBJECTIVE_CHARS, OBJECTIVE_EXCERPT_CHARS } from "./constants";
import type { GoalState, GoalStatus } from "./types";

export type ObjectiveValidation = { ok: true; objective: string } | { ok: false; message: string; hint?: string };

export function validateObjective(input: string): ObjectiveValidation {
	const objective = input.trim();
	if (!objective) {
		return { ok: false, message: "Goal objective must not be empty.", hint: `${GOAL_USAGE}\n${GOAL_USAGE_HINT}` };
	}
	if ([...objective].length > MAX_OBJECTIVE_CHARS) {
		return {
			ok: false,
			message: `Goal objective is too long (${[...objective].length}/${MAX_OBJECTIVE_CHARS} characters).`,
			hint: LONG_OBJECTIVE_HINT,
		};
	}
	return { ok: true, objective };
}

export function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export function formatElapsed(seconds: number): string {
	const total = Math.max(0, Math.floor(seconds));
	if (total < 60) return `${total}s`;
	const minutes = Math.floor(total / 60);
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	const remMinutes = minutes % 60;
	if (hours < 24) return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
	const days = Math.floor(hours / 24);
	const remHours = hours % 24;
	return `${days}d ${remHours}h ${remMinutes}m`;
}

export function formatTokensCompact(tokens: number): string {
	const value = Math.max(0, Math.round(tokens));
	if (value < 1000) return String(value);
	if (value < 1_000_000) return `${trimFixed(value / 1000)}k`;
	return `${trimFixed(value / 1_000_000)}m`;
}

function trimFixed(value: number): string {
	return value >= 10 ? value.toFixed(0) : value.toFixed(1).replace(/\.0$/, "");
}

export function statusLabel(status: GoalStatus): string {
	switch (status) {
		case "active":
			return "active";
		case "paused":
			return "paused";
		case "budgetLimited":
			return "limited by budget";
		case "complete":
			return "complete";
	}
}

export function commandHint(status: GoalStatus): string {
	switch (status) {
		case "active":
			return "Commands: /goal pause, /goal clear";
		case "paused":
			return "Commands: /goal resume, /goal clear";
		case "budgetLimited":
		case "complete":
			return "Commands: /goal clear";
	}
}

export function objectiveExcerpt(objective: string, maxChars = OBJECTIVE_EXCERPT_CHARS): string {
	const chars = [...objective];
	if (chars.length <= maxChars) return objective;
	return `${chars.slice(0, Math.max(0, maxChars - 1)).join("")}…`;
}

export function formatTimeResource(goal: GoalState): string {
	const used = formatElapsed(goal.timeUsedSeconds);
	if (goal.timeBudgetSeconds === undefined) return `Time: ${used}`;
	return `Time: ${used} / ${formatElapsed(goal.timeBudgetSeconds)}`;
}

export function formatTokenResource(goal: GoalState): string {
	const used = formatTokensCompact(goal.tokensUsed);
	if (goal.tokenBudget === undefined) return `Tokens: ${used}`;
	return `Tokens: ${used} / ${formatTokensCompact(goal.tokenBudget)}`;
}

export function goalUsageSummary(goal: GoalState): string {
	return `${formatTimeResource(goal)}; ${formatTokenResource(goal)}`;
}

export function footerStatusText(goal: GoalState): string {
	const usage = footerUsage(goal);
	switch (goal.status) {
		case "active":
			return usage ? `Pursuing goal (${usage})` : "Pursuing goal";
		case "paused":
			return "Goal paused (/goal resume)";
		case "budgetLimited":
			return usage ? `Goal unmet (${usage})` : "Goal abandoned";
		case "complete":
			return usage ? `Goal achieved (${usage})` : "Goal achieved";
	}
}

function footerUsage(goal: GoalState): string | undefined {
	if (goal.status === "paused") return undefined;
	if (goal.tokenBudget !== undefined) {
		const used = formatTokensCompact(goal.tokensUsed);
		const budget = formatTokensCompact(goal.tokenBudget);
		if (goal.status === "active") return `${used} / ${budget}`;
		if (goal.status === "budgetLimited") return `${used} / ${budget} tokens`;
		return `${used} tokens`;
	}
	if (goal.timeBudgetSeconds !== undefined) {
		const used = formatElapsed(goal.timeUsedSeconds);
		const budget = formatElapsed(goal.timeBudgetSeconds);
		return goal.status === "complete" ? used : `${used} / ${budget}`;
	}
	return goal.timeUsedSeconds > 0 ? formatElapsed(goal.timeUsedSeconds) : undefined;
}

export function goalSummaryLines(goal: GoalState): string[] {
	const lines = [
		"Goal",
		`Status: ${statusLabel(goal.status)}`,
		`Objective: ${goal.objective}`,
		`Time used: ${formatElapsed(goal.timeUsedSeconds)}`,
		`Tokens used: ${formatTokensCompact(goal.tokensUsed)}`,
	];
	if (goal.tokenBudget !== undefined) lines.push(`Token budget: ${formatTokensCompact(goal.tokenBudget)}`);
	if (goal.timeBudgetSeconds !== undefined) lines.push(`Time budget: ${formatElapsed(goal.timeBudgetSeconds)}`);
	lines.push("", commandHint(goal.status));
	return lines;
}
