import { Type } from "typebox";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { formatElapsed, validateObjective } from "./format";
import { createTelemetry, noteBudgetLimit } from "./telemetry";
import { createGoalState, getGoal, getTelemetry, persistClearGoal, persistSetGoal, persistUpdateGoal } from "./state";
import { syncGoalUi } from "./ui";
import type { GoalCommandScheduler, GoalContinuationCanceller, GoalState, GoalStatus, GoalTelemetrySnapshot } from "./types";

const EmptyParams = Type.Object({});
const CreateGoalParams = Type.Object({
	objective: Type.String({ description: "Goal objective explicitly requested by the user" }),
	token_budget: Type.Optional(Type.Number({ description: "Optional positive token budget" })),
	time_budget_seconds: Type.Optional(Type.Number({ description: "Optional positive time budget in seconds" })),
});
const NullableNumber = Type.Union([Type.Number(), Type.Null()]);
const UpdateGoalParams = Type.Object({
	status: Type.Optional(Type.String({ description: "Optional status update: active, paused, or complete" })),
	objective: Type.Optional(Type.String({ description: "Optional replacement objective explicitly requested by the user" })),
	token_budget: Type.Optional(NullableNumber),
	time_budget_seconds: Type.Optional(NullableNumber),
});

type ToolDetails = {
	goal: GoalState | null;
	telemetry?: GoalTelemetrySnapshot | null;
	remaining_tokens?: number;
	remaining_time_seconds?: number;
	completion_budget_report?: string;
	error?: string;
};

type GoalToolRuntime = {
	scheduleContinuation?: GoalCommandScheduler;
	cancelContinuation?: GoalContinuationCanceller;
};

export function registerGoalTools(
	pi: ExtensionAPI,
	scheduleContinuation?: GoalCommandScheduler,
	cancelContinuation?: GoalContinuationCanceller,
): void {
	const runtime: GoalToolRuntime = { scheduleContinuation, cancelContinuation };
	registerGetGoalTool(pi);
	registerCreateGoalTool(pi);
	registerUpdateGoalTool(pi, runtime);
	registerClearGoalTool(pi, runtime);
}

function registerGetGoalTool(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "get_goal",
		label: "Get Goal",
		description: "Get the current pi-goal state, including status, budget, token usage, and time usage.",
		promptSnippet: "Inspect the active pi-goal objective and progress state.",
		promptGuidelines: ["Use get_goal to inspect an explicit active goal before deciding whether it is complete."],
		parameters: EmptyParams,
		async execute() {
			return resultForGoal(getGoal(), getTelemetry());
		},
	});
}

function registerCreateGoalTool(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "create_goal",
		label: "Create Goal",
		description: "Create a new pi-goal only when the user explicitly asks for a persistent goal.",
		promptSnippet: "Create an explicit persistent pi-goal when requested.",
		promptGuidelines: [
			"Use create_goal only when the user explicitly asks to create or pursue a persistent goal.",
			"Do not infer goals from ordinary tasks; normal user requests are not automatically pi-goals.",
		],
		parameters: CreateGoalParams,
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			return createGoalFromTool(pi, params, ctx);
		},
	});
}

function registerUpdateGoalTool(pi: ExtensionAPI, runtime: GoalToolRuntime): void {
	pi.registerTool({
		name: "update_goal",
		label: "Update Goal",
		description: "Update the current pi-goal when the user explicitly asks to edit, pause, resume, or complete it.",
		promptSnippet: "Update an explicit pi-goal field or status when requested by the user.",
		promptGuidelines: updateGoalGuidelines(),
		parameters: UpdateGoalParams,
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			return updateGoalFromTool(pi, runtime, params, ctx);
		},
	});
}

function registerClearGoalTool(pi: ExtensionAPI, runtime: GoalToolRuntime): void {
	pi.registerTool({
		name: "clear_goal",
		label: "Clear Goal",
		description: "Clear the current pi-goal when the user explicitly asks to remove the persistent goal or hide the goal widget.",
		promptSnippet: "Clear the explicit persistent pi-goal when requested by the user.",
		promptGuidelines: [
			"Use clear_goal only when the user explicitly asks to clear, remove, delete, or dismiss the current goal.",
			"Do not clear a goal merely because it is complete unless the user asks to clear it.",
		],
		parameters: EmptyParams,
		async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
			const goal = getGoal();
			runtime.cancelContinuation?.(goal?.goalId, "tool-clear");
			persistClearGoal(pi, "tool");
			syncGoalUi(ctx, null);
			return resultForGoal(null, getTelemetry(), goal ? "Goal cleared." : "No goal was set.");
		},
	});
}

function updateGoalGuidelines(): string[] {
	return [
		"Use update_goal with status complete only after verifying the goal objective is actually achieved.",
		"Use update_goal for objective or budget edits only when the user explicitly asks to modify the persistent goal.",
		"Use status paused or active only when the user explicitly asks to pause or resume the goal.",
		"Do not infer goal edits from ordinary task discussion.",
		"Use clear_goal, not update_goal, when the user asks to clear/remove the current goal.",
	];
}

type CreateGoalInput = {
	objective: string;
	token_budget?: number;
	time_budget_seconds?: number;
};

type UpdateGoalInput = {
	status?: string;
	objective?: string;
	token_budget?: number | null;
	time_budget_seconds?: number | null;
};

type GoalUpdateResult = { ok: true; goal: GoalState; prefix: string; budgetChanged?: boolean } | { ok: false; error: string };

function createGoalFromTool(pi: ExtensionAPI, params: CreateGoalInput, ctx: ExtensionContext) {
	if (getGoal()) return errorResult("A goal already exists. Use clear_goal or ask the user before replacing it.");
	const validation = validateObjective(params.objective);
	if (!validation.ok) return errorResult(validation.hint ? `${validation.message} ${validation.hint}` : validation.message);
	const budgetError = validateBudgets(params.token_budget, params.time_budget_seconds);
	if (budgetError) return errorResult(budgetError);
	const goal = createGoalState(validation.objective, params.token_budget, params.time_budget_seconds);
	const telemetry = createTelemetry(goal.goalId, goal.createdAt);
	persistSetGoal(pi, goal, telemetry, "tool");
	syncGoalUi(ctx, goal);
	return resultForGoal(goal, telemetry, "Goal created.");
}

function updateGoalFromTool(pi: ExtensionAPI, runtime: GoalToolRuntime, params: UpdateGoalInput, ctx: ExtensionContext) {
	const goal = getGoal();
	if (!goal) return errorResult("No goal exists to update.");
	const update = buildGoalUpdate(goal, params);
	if (!update.ok) return errorResult(update.error);
	if (update.goal.status === "paused" || update.goal.status === "budgetLimited") runtime.cancelContinuation?.(goal.goalId, "tool-status");
	persistUpdateGoal(pi, update.goal, telemetryForUpdate(update.goal), "tool");
	syncGoalUi(ctx, update.goal);
	if (goal.status !== "active" && update.goal.status === "active") runtime.scheduleContinuation?.(ctx, "resumed");
	return resultForGoal(update.goal, getTelemetry(), update.prefix);
}

function validateBudgets(tokenBudget?: number, timeBudgetSeconds?: number): string | undefined {
	if (tokenBudget !== undefined && (!Number.isInteger(tokenBudget) || tokenBudget <= 0)) return "token_budget must be a positive integer when provided.";
	if (timeBudgetSeconds !== undefined && (!Number.isInteger(timeBudgetSeconds) || timeBudgetSeconds <= 0)) {
		return "time_budget_seconds must be a positive integer when provided.";
	}
	return undefined;
}

function buildGoalUpdate(goal: GoalState, params: UpdateGoalInput): GoalUpdateResult {
	let next: GoalState = { ...goal };
	const changes: string[] = [];
	const objectiveResult = applyObjectiveUpdate(next, params.objective, changes);
	if (!objectiveResult.ok) return objectiveResult;
	next = objectiveResult.goal;
	const budgetResult = applyBudgetUpdates(next, params, changes);
	if (!budgetResult.ok) return budgetResult;
	next = budgetResult.budgetChanged && params.status === undefined ? recomputeStatusAfterBudgetEdit(budgetResult.goal) : budgetResult.goal;
	if (params.status !== undefined) {
		const status = parseToolStatus(params.status);
		if (!status) return { ok: false, error: "status must be active, paused, or complete when provided." };
		next = { ...next, status };
		changes.push(`status ${status}`);
	}
	if (changes.length === 0) return { ok: false, error: "No goal updates were provided." };
	return { ok: true, goal: { ...next, updatedAt: Date.now() }, prefix: next.status === "complete" ? "Goal achieved." : `Goal updated: ${changes.join(", ")}.` };
}

function applyObjectiveUpdate(goal: GoalState, objective: string | undefined, changes: string[]): GoalUpdateResult {
	if (objective === undefined) return { ok: true, goal, prefix: "" };
	const validation = validateObjective(objective);
	if (!validation.ok) return { ok: false, error: validation.hint ? `${validation.message} ${validation.hint}` : validation.message };
	changes.push("objective");
	return { ok: true, goal: { ...goal, objective: validation.objective }, prefix: "" };
}

function applyBudgetUpdates(goal: GoalState, params: UpdateGoalInput, changes: string[]): GoalUpdateResult {
	let next = goal;
	let budgetChanged = false;
	if (params.token_budget !== undefined) {
		if (params.token_budget !== null && (!Number.isInteger(params.token_budget) || params.token_budget <= 0)) return { ok: false, error: "token_budget must be a positive integer or null when provided." };
		next = { ...next, tokenBudget: params.token_budget === null ? undefined : params.token_budget };
		changes.push("token budget");
		budgetChanged = true;
	}
	if (params.time_budget_seconds !== undefined) {
		if (params.time_budget_seconds !== null && (!Number.isInteger(params.time_budget_seconds) || params.time_budget_seconds <= 0)) return { ok: false, error: "time_budget_seconds must be a positive integer or null when provided." };
		next = { ...next, timeBudgetSeconds: params.time_budget_seconds === null ? undefined : params.time_budget_seconds };
		changes.push("time budget");
		budgetChanged = true;
	}
	return { ok: true, goal: next, prefix: "", budgetChanged };
}

function recomputeStatusAfterBudgetEdit(goal: GoalState): GoalState {
	if (goal.status !== "active" && goal.status !== "budgetLimited") return goal;
	return budgetReason(goal) ? { ...goal, status: "budgetLimited" } : { ...goal, status: "active" };
}

function telemetryForUpdate(goal: GoalState): GoalTelemetrySnapshot | null {
	const reason = budgetReason(goal);
	if (goal.status === "budgetLimited" && reason) return noteBudgetLimit(getTelemetry(), reason);
	return getTelemetry();
}

function budgetReason(goal: GoalState): "tokenBudget" | "timeBudget" | undefined {
	if (goal.tokenBudget !== undefined && goal.tokensUsed >= goal.tokenBudget) return "tokenBudget";
	if (goal.timeBudgetSeconds !== undefined && goal.timeUsedSeconds >= goal.timeBudgetSeconds) return "timeBudget";
	return undefined;
}

function parseToolStatus(status: string): GoalStatus | undefined {
	if (status === "active" || status === "paused" || status === "complete") return status;
	return undefined;
}

function resultForGoal(goal: GoalState | null, telemetry: GoalTelemetrySnapshot | null, prefix?: string) {
	const details: ToolDetails = { goal, telemetry, remaining_tokens: remainingTokens(goal), remaining_time_seconds: remainingTime(goal) };
	if (goal?.status === "complete" && (goal.tokenBudget !== undefined || goal.timeBudgetSeconds !== undefined)) {
		details.completion_budget_report = `Goal achieved. Report final budget usage to the user: tokens used: ${goal.tokensUsed}${goal.tokenBudget === undefined ? "" : ` of ${goal.tokenBudget}`}; time used: ${goal.timeUsedSeconds}${goal.timeBudgetSeconds === undefined ? "" : ` of ${goal.timeBudgetSeconds}`} seconds.`;
	}
	return { content: [{ type: "text" as const, text: `${prefix ? `${prefix}\n` : ""}${formatToolGoal(goal)}` }], details };
}

function errorResult(error: string) {
	return { content: [{ type: "text" as const, text: `Error: ${error}` }], details: { goal: getGoal(), telemetry: getTelemetry(), error } as ToolDetails };
}

function remainingTokens(goal: GoalState | null): number | undefined {
	return goal?.tokenBudget === undefined ? undefined : Math.max(0, goal.tokenBudget - goal.tokensUsed);
}

function remainingTime(goal: GoalState | null): number | undefined {
	return goal?.timeBudgetSeconds === undefined ? undefined : Math.max(0, goal.timeBudgetSeconds - goal.timeUsedSeconds);
}

function formatToolGoal(goal: GoalState | null): string {
	if (!goal) return "No goal is currently set.";
	const tokenBudget = goal.tokenBudget === undefined ? "none" : `${goal.tokenBudget} (${remainingTokens(goal)} remaining)`;
	const timeBudget = goal.timeBudgetSeconds === undefined ? "none" : `${formatElapsed(goal.timeBudgetSeconds)} (${remainingTime(goal)} seconds remaining)`;
	return [
		`Goal: ${goal.status}`,
		`Objective: ${goal.objective}`,
		`Time used: ${goal.timeUsedSeconds} seconds`,
		`Tokens used: ${goal.tokensUsed}`,
		`Token budget: ${tokenBudget}`,
		`Time budget: ${timeBudget}`,
	].join("\n");
}
