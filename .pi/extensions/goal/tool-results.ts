import { evaluateCompletionFloor, type CompletionFloorEvaluation } from "./floor";
import { formatElapsed } from "./format";
import { listGoalTemplateMetadata } from "./templates";
import { getGoal, getTelemetry } from "./state";
import type { FloorValuePassId, GoalState, GoalTelemetrySnapshot, NoMoreValuableWorkReason } from "./types";

export type ToolDetails = {
	goal: GoalState | null;
	telemetry?: GoalTelemetrySnapshot | null;
	remaining_tokens?: number;
	remaining_time_seconds?: number;
	completion_budget_report?: string;
	templates?: ReturnType<typeof listGoalTemplateMetadata>;
	resolved_template?: { name: string; path: string };
	error?: string;
	completion_blocked_by_floor?: boolean;
	floor?: CompletionFloorEvaluation;
	next_floor_pass?: {
		id: FloorValuePassId;
		label: string;
		concrete_first_action: string;
		required_evidence: string[];
		avoid: string[];
	};
	no_more_valuable_work_reason?: NoMoreValuableWorkReason | "max_budget_requires_wrap_up";
};

export function resultForGoal(goal: GoalState | null, telemetry: GoalTelemetrySnapshot | null, prefix?: string) {
	const details: ToolDetails = { goal, telemetry, remaining_tokens: remainingTokens(goal), remaining_time_seconds: remainingTime(goal), floor: goal ? evaluateCompletionFloor(goal) : undefined };
	if (goal?.status === "complete" && (goal.tokenBudget !== undefined || goal.timeBudgetSeconds !== undefined)) {
		details.completion_budget_report = `Goal achieved. Report final budget usage to the user: tokens used: ${goal.tokensUsed}${goal.tokenBudget === undefined ? "" : ` of ${goal.tokenBudget}`}; time used: ${goal.timeUsedSeconds}${goal.timeBudgetSeconds === undefined ? "" : ` of ${goal.timeBudgetSeconds}`} seconds.`;
	}
	return { content: [{ type: "text" as const, text: `${prefix ? `${prefix}\n` : ""}${formatToolGoal(goal)}` }], details };
}

export function resultForTemplates(templates: ReturnType<typeof listGoalTemplateMetadata>) {
	const lines = templates.map((template) => {
		const aliases = template.aliases.length ? ` aliases=${template.aliases.join(",")}` : "";
		const placeholders = template.requiredPlaceholders.length ? ` placeholders=${template.requiredPlaceholders.join(",")}` : " placeholders=none";
		return `${template.name}${aliases}${placeholders} path=${template.path}${template.description ? ` — ${template.description}` : ""}`;
	});
	return { content: [{ type: "text" as const, text: lines.length ? lines.join("\n") : "No reusable goal templates found." }], details: { goal: getGoal(), telemetry: getTelemetry(), templates } as ToolDetails };
}

export function errorResult(error: string) {
	return { content: [{ type: "text" as const, text: `Error: ${error}` }], details: { goal: getGoal(), telemetry: getTelemetry(), error } as ToolDetails };
}

export function remainingTokens(goal: GoalState | null): number | undefined {
	return goal?.tokenBudget === undefined ? undefined : Math.max(0, goal.tokenBudget - goal.tokensUsed);
}

export function remainingTime(goal: GoalState | null): number | undefined {
	return goal?.timeBudgetSeconds === undefined ? undefined : Math.max(0, goal.timeBudgetSeconds - goal.timeUsedSeconds);
}

export function formatToolGoal(goal: GoalState | null): string {
	if (!goal) return "No goal is currently set.";
	const tokenBudget = goal.tokenBudget === undefined ? "none" : `${goal.tokenBudget} (${remainingTokens(goal)} remaining)`;
	const timeBudget = goal.timeBudgetSeconds === undefined ? "none" : `${formatElapsed(goal.timeBudgetSeconds)} (${remainingTime(goal)} seconds remaining)`;
	const floor = evaluateCompletionFloor(goal);
	const tokenFloor = floor.minTokensBeforeWrapUp === undefined ? undefined : `Token wrap-up floor: ${goal.tokensUsed} / ${floor.minTokensBeforeWrapUp}${floor.tokenFloorMet ? " (met)" : ` (${floor.tokensRemainingBeforeWrapUp} remaining)`}`;
	const timeFloor = floor.minTimeSecondsBeforeWrapUp === undefined ? undefined : `Time wrap-up floor: ${formatElapsed(goal.timeUsedSeconds)} / ${formatElapsed(floor.minTimeSecondsBeforeWrapUp)}${floor.timeFloorMet ? " (met)" : ` (${floor.timeSecondsRemainingBeforeWrapUp} seconds remaining)`}`;
	return [
		`Goal: ${goal.status}`,
		`Objective: ${goal.objective}`,
		`Time used: ${goal.timeUsedSeconds} seconds`,
		`Tokens used: ${goal.tokensUsed}`,
		`Token budget: ${tokenBudget}`,
		`Time budget: ${timeBudget}`,
		...(tokenFloor ? [tokenFloor] : []),
		...(timeFloor ? [timeFloor] : []),
	].join("\n");
}
