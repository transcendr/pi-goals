import { Type } from "typebox";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { validateObjective } from "./format";
import { createTelemetry } from "./telemetry";
import { resolveGoalTemplateByName } from "./templates";
import { createGoalState, getGoal, getTelemetry, persistSetGoal } from "./state";
import { enqueueGoal, dequeueGoal, removeGoal, persistEnqueue, persistDequeue, persistRemove, getQueue, type QueuedGoal } from "./queue-state";
import type { GoalMonitorScheduler, GoalState, GoalTelemetrySnapshot } from "./types";
import { syncGoalUi } from "./ui";

const EmptyParams = Type.Object({});
const CreateGoalParams = Type.Object({
	objective: Type.String({ description: "Goal objective explicitly requested by the user" }),
	token_budget: Type.Optional(Type.Number({ description: "Optional positive token budget" })),
	time_budget_seconds: Type.Optional(Type.Number({ description: "Optional positive time budget in seconds" })),
});

type QueueToolDetails = {
	goal: GoalState | null;
	telemetry: GoalTelemetrySnapshot | null;
	queue?: QueuedGoal[];
	queued?: QueuedGoal;
	dequeued?: QueuedGoal;
	started?: QueuedGoal;
	error?: string;
};

type GoalQueueToolRuntime = {
	scheduleMonitor?: GoalMonitorScheduler;
};

export function registerGoalQueueTools(pi: ExtensionAPI, runtime: GoalQueueToolRuntime = {}): void {
	registerListGoalQueueTool(pi);
	registerEnqueueGoalTool(pi);
	registerStartQueuedGoalTool(pi, runtime);
	registerDequeueGoalTool(pi);
	registerRemoveQueuedGoalTool(pi);
}

function registerListGoalQueueTool(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "list_goal_queue",
		label: "List Goal Queue",
		description: "List queued goal objectives that will be started after the current goal completes or clears.",
		promptSnippet: "Discover queued goals waiting to start after the current goal.",
		promptGuidelines: ["Use only when the user explicitly asks to see or review the goal queue.", "Do not infer queue listing from ordinary task requests."],
		parameters: EmptyParams,
		async execute() {
			return resultForQueue();
		},
	});
}

function registerEnqueueGoalTool(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "enqueue_goal",
		label: "Enqueue Goal",
		description: "Add a goal to the queue to be started after the current goal completes or clears. Use only when the user explicitly asks to queue a goal for later.",
		promptSnippet: "Queue a goal for later when the user explicitly asks.",
		promptGuidelines: ["Use only when the user explicitly asks to queue a goal for later, not for ordinary task requests.", "Fill flags and args from the user's prose, but ask for missing required values instead of guessing."],
		parameters: CreateGoalParams,
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const validation = validateObjective(params.objective);
			if (!validation.ok) return errorResult(validation.hint ? `${validation.message} ${validation.hint}` : validation.message);
			const queued = enqueueGoal(validation.objective, "tool", { tokenBudget: params.token_budget, timeBudgetSeconds: params.time_budget_seconds });
			persistEnqueue(pi, queued);
			syncGoalUi(ctx, getGoal());
			return resultForQueuedGoal(queued);
		},
	});
}

function registerStartQueuedGoalTool(pi: ExtensionAPI, runtime: GoalQueueToolRuntime): void {
	pi.registerTool({
		name: "start_queued_goal",
		label: "Start Queued Goal",
		description: "Start the next queued item only after deciding the queue head is a direct concrete goal. The queue item is removed only after goal creation succeeds.",
		promptSnippet: "Start the queue head only when semantic classification says it is a direct goal.",
		promptGuidelines: [
			"Use this only after reading the queue head and deciding the queued text itself is the concrete goal to perform.",
			"Do not use this when the queued text asks you to run/create/start another goal or goal template; use create_goal, create_goal_from_template, or enqueue_goal for that orchestration, then dequeue_goal after it is satisfied.",
			"This tool handles completed-goal replacement and safe dequeue for direct queue items only.",
			"If this reports an active non-complete goal, leave the queued goal in place and continue the active goal.",
		],
		parameters: EmptyParams,
		async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
			return startQueuedGoal(pi, runtime, ctx);
		},
	});
}

function registerDequeueGoalTool(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "dequeue_goal",
		label: "Dequeue Goal",
		description: "Remove the first goal from the queue and return it. Prefer start_queued_goal for direct queued goals; use this after a prose/JIT orchestration item is fully satisfied.",
		promptSnippet: "Remove the queue head after manual handling or completed prose/JIT orchestration.",
		promptGuidelines: [
			"Use start_queued_goal for direct queued goals.",
			"Use dequeue_goal after you have separately satisfied a prose/JIT orchestration queue item, including any one-or-more consecutive active goals it required.",
			"Do not dequeue an orchestration item just because you saw it; consume it only after successful handling, or when the user explicitly asks to remove it.",
		],
		parameters: EmptyParams,
		async execute() {
			const dequeued = dequeueGoal();
			if (!dequeued) return { content: [{ type: "text" as const, text: "No queued goals." }], details: { goal: getGoal(), telemetry: getTelemetry() } as QueueToolDetails };
			persistDequeue(pi, "dequeued");
			return { content: [{ type: "text" as const, text: `Dequeued goal: ${dequeued.queueId}\nObjective: ${dequeued.objective}` }], details: { goal: getGoal(), telemetry: getTelemetry(), dequeued } as QueueToolDetails };
		},
	});
}

function registerRemoveQueuedGoalTool(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "remove_queued_goal",
		label: "Remove Queued Goal",
		description: "Remove a specific goal from the queue by its queue ID.",
		promptSnippet: "Remove a specific queued goal by ID.",
		promptGuidelines: ["Use only when the user explicitly asks to remove a specific queued goal."],
		parameters: Type.Object({ queueId: Type.String({ description: "Queue ID of the goal to remove" }) }),
		async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
			const removed = removeGoal(params.queueId);
			if (!removed) return errorResult(`No queued goal found with id ${params.queueId}.`);
			persistRemove(pi, params.queueId, "tool_remove");
			return { content: [{ type: "text" as const, text: `Removed queued goal: ${removed.queueId}` }], details: { goal: getGoal(), telemetry: getTelemetry() } as QueueToolDetails };
		},
	});
}

function startQueuedGoal(pi: ExtensionAPI, runtime: GoalQueueToolRuntime, ctx: ExtensionContext) {
	const current = getGoal();
	if (current && current.status !== "complete") return errorResult("A non-complete goal is already active. The queued goal was left in the queue.");
	const next = getQueue()[0];
	if (!next) return { content: [{ type: "text" as const, text: "No queued goals." }], details: { goal: current, telemetry: getTelemetry(), queue: getQueue() } as QueueToolDetails };
	const objective = resolveQueuedObjective(next);
	if (!objective.ok) return errorResult(objective.error);
	const validation = validateObjective(objective.objective);
	if (!validation.ok) return errorResult(validation.hint ? `${validation.message} ${validation.hint}` : validation.message);
	return createAndDequeueQueuedGoal(pi, runtime, ctx, next, validation.objective);
}

function createAndDequeueQueuedGoal(pi: ExtensionAPI, runtime: GoalQueueToolRuntime, ctx: ExtensionContext, next: QueuedGoal, objective: string) {
	const goal = createGoalState(objective, next.tokenBudget, next.timeBudgetSeconds);
	const telemetry = createTelemetry(goal.goalId, goal.createdAt);
	persistSetGoal(pi, goal, telemetry, "tool");
	const dequeued = dequeueGoal();
	persistDequeue(pi, "start_queued_goal");
	syncGoalUi(ctx, goal);
	runtime.scheduleMonitor?.(ctx);
	return { content: [{ type: "text" as const, text: `Started queued goal: ${dequeued?.queueId ?? next.queueId}\nObjective: ${goal.objective}` }], details: { goal, telemetry, started: dequeued ?? next, queue: getQueue() } as QueueToolDetails };
}

type QueuedObjectiveResolution = { ok: true; objective: string } | { ok: false; error: string };

function resolveQueuedObjective(goal: QueuedGoal): QueuedObjectiveResolution {
	if (!goal.template) return { ok: true, objective: goal.objective };
	const resolved = resolveGoalTemplateByName(goal.template, goal.templateFlags ?? {}, goal.templateArgs ?? "");
	if (!resolved.ok) return "notTemplate" in resolved ? { ok: false, error: `Unknown goal template '${goal.template}'.` } : { ok: false, error: resolved.error };
	return { ok: true, objective: resolved.template.objective };
}

function resultForQueue() {
	const queue = getQueue();
	if (queue.length === 0) return { content: [{ type: "text" as const, text: "No queued goals." }], details: { goal: getGoal(), telemetry: getTelemetry(), queue } as QueueToolDetails };
	const lines = queue.map((g, i) => `${i + 1}. [${g.queueId}] ${g.objective.length > 120 ? `${g.objective.slice(0, 117)}…` : g.objective}`);
	return { content: [{ type: "text" as const, text: `Queued goals (${queue.length}):\n${lines.join("\n")}` }], details: { goal: getGoal(), telemetry: getTelemetry(), queue } as QueueToolDetails };
}

function resultForQueuedGoal(queued: QueuedGoal) {
	const objective = queued.objective.length > 120 ? `${queued.objective.slice(0, 117)}…` : queued.objective;
	return { content: [{ type: "text" as const, text: `Queued goal: ${queued.queueId}\nObjective: ${objective}` }], details: { goal: getGoal(), telemetry: getTelemetry(), queued } as QueueToolDetails };
}

function errorResult(message: string) {
	return { content: [{ type: "text" as const, text: `Error: ${message}` }], details: { goal: getGoal(), telemetry: getTelemetry(), error: message } as QueueToolDetails };
}
