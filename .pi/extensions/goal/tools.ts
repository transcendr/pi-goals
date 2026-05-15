import { CreateGoalFromTemplateParams, CreateGoalParams, EmptyParams, NullableNumber, UpdateGoalParams } from "./tool-schemas";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { validateObjective } from "./format";
import { isBudgetExhausted, canActivateGoal } from "./budget";
import { decideGoalCompletionWithRecentMonitorPatterns, type CompletionDecision } from "./completion-gate";
import { evaluateCompletionFloor, validateFloorConfig, type CompletionFloorEvaluation } from "./floor";
import { createTelemetry, noteBudgetLimit, noteFloorCompletionDeferred } from "./telemetry";
import { listGoalTemplateMetadata } from "./templates";
import { buildDirectGoalIntent, buildTemplateGoalIntent } from "./goal-intent";
import { createPostCompletionActionStates, recordPostStartActionAnchors, type PostCompletionActionRunner } from "./post-completion-actions";
import { createGoalState, getGoal, getTelemetry, persistClearGoal, persistSetGoal, persistTelemetry, persistUpdateGoal } from "./state";
import { registerGoalQueueTools } from "./queue-tools";
import { syncGoalUi } from "./ui";
import { errorResult, formatToolGoal, remainingTime, remainingTokens, resultForGoal, resultForTemplates, type ToolDetails } from "./tool-results";
import type { GoalCommandScheduler, GoalContinuationCanceller, GoalMonitorCanceller, GoalMonitorScheduler, GoalQueueSteeringSender, GoalState, GoalStatus, GoalTelemetrySnapshot } from "./types";

type GoalToolRuntime = {
	scheduleContinuation?: GoalCommandScheduler;
	cancelContinuation?: GoalContinuationCanceller;
	scheduleMonitor?: GoalMonitorScheduler;
	cancelMonitor?: GoalMonitorCanceller;
	scheduleBudgetLimitWrapUp?: (ctx: ExtensionContext, goal: GoalState) => void;
	getQueueSize?: () => number;
	sendQueueSteering?: GoalQueueSteeringSender;
	sendQueueHandoff?: GoalQueueSteeringSender;
	postCompletionRunner?: PostCompletionActionRunner;
};

export function registerGoalTools(pi: ExtensionAPI, runtime: GoalToolRuntime = {}): void {
	registerGetGoalTool(pi);
	registerListGoalTemplatesTool(pi);
	registerCreateGoalTool(pi, runtime);
	registerCreateGoalFromTemplateTool(pi, runtime);
	registerUpdateGoalTool(pi, runtime);
	registerGoalQueueTools(pi, { scheduleMonitor: runtime.scheduleMonitor, sendQueueHandoff: runtime.sendQueueHandoff });
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

function registerListGoalTemplatesTool(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "list_goal_templates",
		label: "List Goal Templates",
		description: "List reusable .pi-goals templates for explicit natural-language goal creation requests.",
		promptSnippet: "Discover available reusable goal templates and their required inputs.",
		promptGuidelines: [
			"Use when the user explicitly asks to create or start a persistent goal from a reusable prompt/template.",
			"Use when queue steering asks you to resolve an abstract or prompt-like queued item against reusable goal templates before deciding whether to call start_queued_goal.",
			"Use the returned names, aliases, descriptions, and placeholders to decide whether a queued request semantically matches exactly one template and whether enough structured values are available before creating a goal from a template.",
		],
		parameters: EmptyParams,
		async execute() {
			const templates = listGoalTemplateMetadata();
			return resultForTemplates(templates);
		},
	});
}

function registerCreateGoalTool(pi: ExtensionAPI, runtime: GoalToolRuntime): void {
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
			return createGoalFromTool(pi, runtime, params, ctx);
		},
	});
}

function registerCreateGoalFromTemplateTool(pi: ExtensionAPI, runtime: GoalToolRuntime): void {
	pi.registerTool({
		name: "create_goal_from_template",
		label: "Create Goal From Template",
		description: "Resolve a reusable .pi-goals template from structured parameters and create the resulting persistent goal.",
		promptSnippet: "Create a persistent goal from an explicitly requested reusable goal template.",
		promptGuidelines: [
			"Use when the user explicitly asks to create or start a persistent goal from a reusable prompt/template.",
			"Use when queue steering and list_goal_templates identify exactly one reusable template that fits a queued orchestration item.",
			"Fill template flags and args from the user's prose or current context, but ask for missing required values instead of guessing.",
			"Do not use this for ordinary non-goal task requests.",
		],
		parameters: CreateGoalFromTemplateParams,
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			return createGoalFromTemplateTool(pi, runtime, params, ctx);
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
			runtime.cancelMonitor?.(goal?.goalId, "tool-clear");
			persistClearGoal(pi, "tool");
			syncGoalUi(ctx, null);
			const queueSize = runtime.getQueueSize?.() ?? 0;
			if (queueSize > 0) runtime.sendQueueSteering?.("goal-clear");
			const queueHint = queueSize > 0 ? ` ${queueSize} queued goal${queueSize > 1 ? "s" : ""} available. Queue steering was sent to the agent context.` : "";
			return resultForGoal(null, getTelemetry(), goal ? `Goal cleared.${queueHint}` : `No goal was set.${queueHint}`);
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

type PostCompletionToolInput = {
	post_completion_context?: "none" | "clear" | "summarize";
	post_completion_actions?: Array<{ type: "context.reset"; mode: "clear" | "summarize" }>;
};

type CreateGoalInput = PostCompletionToolInput & {
	objective: string;
	token_budget?: number;
	time_budget_seconds?: number;
	min_tokens_before_wrap_up?: number;
	min_time_seconds_before_wrap_up?: number;
};

type CreateGoalFromTemplateInput = PostCompletionToolInput & {
	template: string;
	flags?: Record<string, string>;
	args?: string;
	token_budget?: number;
	time_budget_seconds?: number;
	min_tokens_before_wrap_up?: number;
	min_time_seconds_before_wrap_up?: number;
};

type UpdateGoalInput = {
	status?: string;
	objective?: string;
	token_budget?: number | null;
	time_budget_seconds?: number | null;
	min_tokens_before_wrap_up?: number | null;
	min_time_seconds_before_wrap_up?: number | null;
};

type GoalUpdateResult = { ok: true; goal: GoalState; prefix: string; budgetChanged?: boolean } | { ok: false; error: string };

function createGoalFromTool(pi: ExtensionAPI, runtime: GoalToolRuntime, params: CreateGoalInput, ctx: ExtensionContext) {
	return createGoalWithPolicy(pi, runtime, params, ctx, { replaceCompleted: false });
}

function goalBudgets(params: CreateGoalInput | CreateGoalFromTemplateInput) {
	return { tokenBudget: params.token_budget, timeBudgetSeconds: params.time_budget_seconds, minTokensBeforeWrapUp: params.min_tokens_before_wrap_up, minTimeSecondsBeforeWrapUp: params.min_time_seconds_before_wrap_up };
}

function createGoalFromTemplateTool(pi: ExtensionAPI, runtime: GoalToolRuntime, params: CreateGoalFromTemplateInput, ctx: ExtensionContext) {
	const invocationArgs = params.args?.trim() ? ` ${params.args.trim()}` : "";
	const intent = buildTemplateGoalIntent({ invocation: `${params.template}${invocationArgs}`, postCompletionContext: params.post_completion_context, postCompletionActions: params.post_completion_actions, budgets: goalBudgets(params) });
	if (!intent.ok) return errorResult(intent.error);
	const created = createGoalWithPolicy(pi, runtime, { ...params, objective: intent.intent.objective, post_completion_actions: intent.intent.postCompletionActions }, ctx, { replaceCompleted: true, replaceBudgetLimitedForQueuedWork: true });
	if (!created.details.error && intent.intent.kind === "template") created.details.resolved_template = { name: intent.intent.template, path: intent.intent.template };
	return created;
}

function createGoalWithPolicy(
	pi: ExtensionAPI,
	runtime: GoalToolRuntime,
	params: CreateGoalInput,
	ctx: ExtensionContext,
	policy: { replaceCompleted: boolean; replaceBudgetLimitedForQueuedWork?: boolean },
) {
	const current = getGoal();
	if (current && !canReplaceCurrentGoal(current, runtime, policy)) return errorResult("A goal already exists. Use clear_goal or ask the user before replacing it.");
	const normalized = normalizeCreateGoalInput(params);
	if (!normalized.ok) return errorResult(normalized.error);
	let goal = createGoalState({ objective: normalized.objective, tokenBudget: params.token_budget, timeBudgetSeconds: params.time_budget_seconds, minTokensBeforeWrapUp: params.min_tokens_before_wrap_up, minTimeSecondsBeforeWrapUp: params.min_time_seconds_before_wrap_up, postCompletionActions: createPostCompletionActionStates(normalized.postCompletionActions) });
	goal = recordPostStartActionAnchors(pi, ctx, goal, "tool");
	const telemetry = createTelemetry(goal.goalId, goal.createdAt);
	persistSetGoal(pi, goal, telemetry, "tool");
	syncGoalUi(ctx, goal);
	runtime.scheduleMonitor?.(ctx);
	return resultForGoal(goal, telemetry, goalCreatedPrefix(current));
}

type NormalizedCreateGoalInput = { ok: true; objective: string; postCompletionActions: Array<{ type: "context.reset"; mode: "clear" | "summarize" }> } | { ok: false; error: string };

function normalizeCreateGoalInput(params: CreateGoalInput): NormalizedCreateGoalInput {
	const intent = buildDirectGoalIntent({ objective: params.objective, postCompletionContext: params.post_completion_context, postCompletionActions: params.post_completion_actions, budgets: goalBudgets(params) });
	if (!intent.ok) return { ok: false, error: intent.error };
	const validation = validateObjective(intent.intent.objective);
	if (!validation.ok) return { ok: false, error: validation.hint ? `${validation.message} ${validation.hint}` : validation.message };
	const budgetError = validateBudgets(params.token_budget, params.time_budget_seconds);
	if (budgetError) return { ok: false, error: budgetError };
	const floorError = validateFloorConfig({ tokenBudget: params.token_budget, timeBudgetSeconds: params.time_budget_seconds, minTokensBeforeWrapUp: params.min_tokens_before_wrap_up, minTimeSecondsBeforeWrapUp: params.min_time_seconds_before_wrap_up });
	return floorError ? { ok: false, error: floorError } : { ok: true, objective: validation.objective, postCompletionActions: intent.intent.postCompletionActions };
}

function canReplaceCurrentGoal(current: GoalState, runtime: GoalToolRuntime, policy: { replaceCompleted: boolean; replaceBudgetLimitedForQueuedWork?: boolean }): boolean {
	if (policy.replaceCompleted && current.status === "complete") return true;
	if (policy.replaceBudgetLimitedForQueuedWork && current.status === "budgetLimited" && (runtime.getQueueSize?.() ?? 0) > 0) return true;
	return false;
}

function goalCreatedPrefix(current: GoalState | null): string {
	if (current?.status === "complete") return "Goal created; replaced completed goal.";
	if (current?.status === "budgetLimited") return "Goal created; replaced budget-limited goal for queued work.";
	return "Goal created.";
}

function updateGoalFromTool(pi: ExtensionAPI, runtime: GoalToolRuntime, params: UpdateGoalInput, ctx: ExtensionContext) {
	const goal = getGoal();
	if (!goal) return errorResult("No goal exists to update.");
	const update = buildGoalUpdate(goal, params);
	if (!update.ok) return errorResult(update.error);
	// Refuse to reactivate a goal whose budgets are still exhausted.
	if (update.goal.status === "active" && !canActivateGoal(update.goal)) {
		const reason = isBudgetExhausted(update.goal);
		const resource = reason === "tokenBudget" ? "token" : reason === "timeBudget" ? "time" : "budget";
		return errorResult(`Cannot resume: ${resource} budget is still exhausted. Raise the budget or use clear_goal before resuming.`);
	}
	const completionDecision = decideGoalCompletionWithRecentMonitorPatterns({
		currentGoal: goal,
		candidateGoal: update.goal,
		telemetry: getTelemetry(),
	});
	if (completionDecision.kind === "defer_and_steer") return floorCompletionDeferredResult(pi, ctx, goal, completionDecision);
	if (update.goal.status !== "active") {
		runtime.cancelContinuation?.(goal.goalId, "tool-status");
		runtime.cancelMonitor?.(goal.goalId, "tool-status");
	}
	persistUpdateGoal(pi, update.goal, telemetryForUpdate(update.goal, completionDecision), "tool");
	syncGoalUi(ctx, update.goal);
	queueHandoffAfterToolUpdate(runtime, ctx, goal, update.goal);
	if (goal.status !== "active" && update.goal.status === "active") {
		runtime.scheduleMonitor?.(ctx);
		runtime.scheduleContinuation?.(ctx, "resumed");
	}
	return resultForGoal(update.goal, getTelemetry(), update.prefix);
}

function floorCompletionDeferredResult(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	goal: GoalState,
	decision: Extract<CompletionDecision, { kind: "defer_and_steer" }>,
) {
	const telemetry = noteFloorCompletionDeferred(getTelemetry(), decision.card.id);
	if (telemetry) persistTelemetry(pi, telemetry, "floor");
	syncGoalUi(ctx, goal);
	return {
		content: [{ type: "text" as const, text: `${decision.message}
${formatToolGoal(goal)}` }],
		details: {
			goal,
			telemetry: telemetry ?? getTelemetry(),
			completion_blocked_by_floor: true,
			floor: decision.floor,
			next_floor_pass: {
				id: decision.card.id,
				label: decision.card.label,
				concrete_first_action: decision.card.concreteFirstAction,
				required_evidence: decision.card.requiredEvidence,
				avoid: decision.card.avoid,
			},
		} as ToolDetails,
	};
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
	next = budgetResult.goal;
	const floorResult = applyFloorUpdates(next, params, changes);
	if (!floorResult.ok) return floorResult;
	next = floorResult.floorChanged && params.status === "complete" ? floorResult.goal : floorResult.goal;
	const floorError = validateFloorConfig({ tokenBudget: next.tokenBudget, timeBudgetSeconds: next.timeBudgetSeconds, minTokensBeforeWrapUp: next.minTokensBeforeWrapUp, minTimeSecondsBeforeWrapUp: next.minTimeSecondsBeforeWrapUp });
	if (floorError) return { ok: false, error: floorError };
	if (floorResult.floorChanged && params.status === "complete") return { ok: false, error: "Floor edits and status complete must be separate update_goal calls." };
	next = budgetResult.budgetChanged && params.status === undefined ? recomputeStatusAfterBudgetEdit(next) : next;
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

function applyFloorUpdates(goal: GoalState, params: UpdateGoalInput, changes: string[]): GoalUpdateResult & { floorChanged?: boolean } {
	let next = goal;
	let floorChanged = false;
	if (params.min_tokens_before_wrap_up !== undefined) {
		if (params.min_tokens_before_wrap_up !== null && (!Number.isInteger(params.min_tokens_before_wrap_up) || params.min_tokens_before_wrap_up <= 0)) return { ok: false, error: "min_tokens_before_wrap_up must be a positive integer or null when provided." };
		next = { ...next, minTokensBeforeWrapUp: params.min_tokens_before_wrap_up === null ? undefined : params.min_tokens_before_wrap_up };
		changes.push("token wrap-up floor");
		floorChanged = true;
	}
	if (params.min_time_seconds_before_wrap_up !== undefined) {
		if (params.min_time_seconds_before_wrap_up !== null && (!Number.isInteger(params.min_time_seconds_before_wrap_up) || params.min_time_seconds_before_wrap_up <= 0)) return { ok: false, error: "min_time_seconds_before_wrap_up must be a positive integer or null when provided." };
		next = { ...next, minTimeSecondsBeforeWrapUp: params.min_time_seconds_before_wrap_up === null ? undefined : params.min_time_seconds_before_wrap_up };
		changes.push("time wrap-up floor");
		floorChanged = true;
	}
	return { ok: true, goal: next, prefix: "", floorChanged };
}

function queueHandoffAfterToolUpdate(runtime: GoalToolRuntime, ctx: ExtensionContext, previousGoal: GoalState, updatedGoal: GoalState): void {
	if (previousGoal.status !== "complete" && updatedGoal.status === "complete") {
		// The tool result must settle before any navigation-capable terminal workflow runs.
		// handleToolResult marks the turn as completed, then turn_end processes post-completion actions and queue handoff.
		return;
	}
	// Only schedule wrap-up when an active goal transitions to budgetLimited due to a budget edit and no queued work is waiting.
	if (previousGoal.status === "active" && updatedGoal.status === "budgetLimited" && isBudgetExhausted(updatedGoal)) {
		if ((runtime.getQueueSize?.() ?? 0) > 0) runtime.sendQueueHandoff?.("goal-budget-limited", { goalId: updatedGoal.goalId, triggerTurn: true });
		else runtime.scheduleBudgetLimitWrapUp?.(ctx, updatedGoal);
	}
}

function recomputeStatusAfterBudgetEdit(goal: GoalState): GoalState {
	if (goal.status !== "active" && goal.status !== "budgetLimited") return goal;
	return isBudgetExhausted(goal) ? { ...goal, status: "budgetLimited" } : { ...goal, status: "active" };
}

function telemetryForUpdate(goal: GoalState, completionDecision: CompletionDecision): GoalTelemetrySnapshot | null {
	const reason = isBudgetExhausted(goal);
	if (goal.status === "budgetLimited" && reason) return noteBudgetLimit(getTelemetry(), reason);
	if (completionDecision.kind !== "allow_with_reason") return getTelemetry();
	const telemetry = getTelemetry();
	return telemetry ? { ...telemetry, noMoreValuableWorkReason: completionDecision.reason === "max_budget_requires_wrap_up" ? "max_budget_requires_wrap_up" : completionDecision.reason, floorQualityState: completionDecision.reason === "max_budget_requires_wrap_up" ? "overriddenByMaxBudget" : telemetry.floorQualityState, updatedAt: Date.now() } : telemetry;
}

function parseToolStatus(status: string): GoalStatus | undefined {
	return status === "active" || status === "paused" || status === "complete" ? status : undefined;
}
