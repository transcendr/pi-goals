import { Type } from "typebox";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { validateObjective } from "./format";
import { createTelemetry } from "./telemetry";
import { createGoalState, getGoal, getTelemetry, persistSetGoal, persistUpdateGoal } from "./state";
import { syncGoalUi } from "./ui";
import type { GoalState, GoalTelemetrySnapshot } from "./types";

const EmptyParams = Type.Object({});
const CreateGoalParams = Type.Object({
	objective: Type.String({ description: "Goal objective explicitly requested by the user" }),
	token_budget: Type.Optional(Type.Number({ description: "Optional positive token budget" })),
});
const UpdateGoalParams = Type.Object({
	status: Type.Literal("complete"),
});

type ToolDetails = {
	goal: GoalState | null;
	telemetry?: GoalTelemetrySnapshot | null;
	remaining_tokens?: number;
	completion_budget_report?: string;
	error?: string;
};

export function registerGoalTools(pi: ExtensionAPI): void {
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
			if (getGoal()) return errorResult("A goal already exists. Use /goal clear or ask the user before replacing it.");
			const validation = validateObjective(params.objective);
			if (!validation.ok) return errorResult(validation.hint ? `${validation.message} ${validation.hint}` : validation.message);
			if (params.token_budget !== undefined && (!Number.isInteger(params.token_budget) || params.token_budget <= 0)) {
				return errorResult("token_budget must be a positive integer when provided.");
			}
			const goal = createGoalState(validation.objective, params.token_budget);
			const telemetry = createTelemetry(goal.goalId, goal.createdAt);
			persistSetGoal(pi, goal, telemetry, "tool");
			syncGoalUi(ctx, goal);
			return resultForGoal(goal, telemetry, "Goal created.");
		},
	});

	pi.registerTool({
		name: "update_goal",
		label: "Update Goal",
		description: "Mark the current pi-goal complete after auditing that all objective requirements are satisfied.",
		promptSnippet: "Mark an explicit pi-goal complete only after a completion audit succeeds.",
		promptGuidelines: [
			"Use update_goal only with status complete and only after verifying the goal objective is actually achieved.",
			"Do not use update_goal to pause, resume, clear, or budget-limit a goal; those are user/runtime controls.",
		],
		parameters: UpdateGoalParams,
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const goal = getGoal();
			if (!goal) return errorResult("No goal exists to update.");
			if (params.status !== "complete") return errorResult("update_goal only accepts status complete.");
			const complete: GoalState = { ...goal, status: "complete", updatedAt: Date.now() };
			persistUpdateGoal(pi, complete, getTelemetry(), "tool");
			syncGoalUi(ctx, complete);
			return resultForGoal(complete, getTelemetry(), "Goal achieved.");
		},
	});
}

function resultForGoal(goal: GoalState | null, telemetry: GoalTelemetrySnapshot | null, prefix?: string) {
	const details: ToolDetails = { goal, telemetry, remaining_tokens: remainingTokens(goal) };
	if (goal?.status === "complete" && goal.tokenBudget !== undefined) {
		details.completion_budget_report = `Goal achieved. Report final budget usage to the user: tokens used: ${goal.tokensUsed} of ${goal.tokenBudget}; time used: ${goal.timeUsedSeconds} seconds.`;
	}
	return { content: [{ type: "text" as const, text: `${prefix ? `${prefix}\n` : ""}${formatToolGoal(goal)}` }], details };
}

function errorResult(error: string) {
	return { content: [{ type: "text" as const, text: `Error: ${error}` }], details: { goal: getGoal(), telemetry: getTelemetry(), error } as ToolDetails };
}

function remainingTokens(goal: GoalState | null): number | undefined {
	return goal?.tokenBudget === undefined ? undefined : Math.max(0, goal.tokenBudget - goal.tokensUsed);
}

function formatToolGoal(goal: GoalState | null): string {
	if (!goal) return "No goal is currently set.";
	const budget = goal.tokenBudget === undefined ? "none" : `${goal.tokenBudget} (${remainingTokens(goal)} remaining)`;
	return [
		`Goal: ${goal.status}`,
		`Objective: ${goal.objective}`,
		`Time used: ${goal.timeUsedSeconds} seconds`,
		`Tokens used: ${goal.tokensUsed}`,
		`Token budget: ${budget}`,
	].join("\n");
}
