import { Type } from "typebox";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { formatElapsed, validateObjective } from "./format";
import { enqueueGoal, dequeueGoal, removeGoal, persistEnqueue, persistDequeue, persistRemove, persistClearQueue, getQueue } from "./queue-state";
import { getGoal, getTelemetry } from "./state";
import { syncGoalUi } from "./ui";

const EmptyParams = Type.Object({});
const CreateGoalParams = Type.Object({
	objective: Type.String({ description: "Goal objective explicitly requested by the user" }),
	token_budget: Type.Optional(Type.Number({ description: "Optional positive token budget" })),
	time_budget_seconds: Type.Optional(Type.Number({ description: "Optional positive time budget in seconds" })),
});

type ToolDetails = { goal: unknown; telemetry: unknown; [key: string]: unknown };

function errorResult(message: string) {
	return { content: [{ type: "text" as const, text: `Error: ${message}` }], details: { goal: getGoal(), telemetry: getTelemetry(), error: message } as ToolDetails };
}

export function registerGoalQueueTools(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "list_goal_queue",
		label: "List Goal Queue",
		description: "List queued goal objectives that will be started after the current goal completes or clears.",
		promptSnippet: "Discover queued goals waiting to start after the current goal.",
		promptGuidelines: [
			"Use only when the user explicitly asks to see or review the goal queue.",
			"Do not infer queue listing from ordinary task requests.",
		],
		parameters: EmptyParams,
		async execute() {
			const queue = getQueue();
			if (!queue || queue.length === 0) return { content: [{ type: "text" as const, text: "No queued goals." }], details: { goal: getGoal(), telemetry: getTelemetry(), queue } as ToolDetails };
			const lines = queue.map((g, i) => `${i + 1}. [${g.queueId}] ${g.objective.length > 120 ? g.objective.slice(0, 117) + "\u2026" : g.objective}`);
			return { content: [{ type: "text" as const, text: `Queued goals (${queue.length}):\n${lines.join("\n")}` }], details: { goal: getGoal(), telemetry: getTelemetry(), queue } as ToolDetails };
		},
	});

	pi.registerTool({
		name: "enqueue_goal",
		label: "Enqueue Goal",
		description: "Add a goal to the queue to be started after the current goal completes or clears. Use only when the user explicitly asks to queue a goal for later.",
		promptSnippet: "Queue a goal for later when the user explicitly asks.",
		promptGuidelines: [
			"Use only when the user explicitly asks to queue a goal for later, not for ordinary task requests.",
			"Fill flags and args from the user's prose, but ask for missing required values instead of guessing.",
		],
		parameters: CreateGoalParams,
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const validation = validateObjective(params.objective);
			if (!validation.ok) return errorResult(validation.hint ? `${validation.message} ${validation.hint}` : validation.message);
			const queued = enqueueGoal(validation.objective, "tool", { tokenBudget: params.token_budget, timeBudgetSeconds: params.time_budget_seconds });
			persistEnqueue(pi, queued);
			syncGoalUi(ctx, getGoal());
			return { content: [{ type: "text" as const, text: `Queued goal: ${queued.queueId}\nObjective: ${queued.objective.length > 120 ? queued.objective.slice(0, 117) + "\u2026" : queued.objective}` }], details: { goal: getGoal(), telemetry: getTelemetry(), queued } as ToolDetails };
		},
	});

	pi.registerTool({
		name: "dequeue_goal",
		label: "Dequeue Goal",
		description: "Remove the first goal from the queue and return it. Use when the current goal completes or clears and the next queued goal should be started.",
		promptSnippet: "Dequeue the next queued goal to start it.",
		promptGuidelines: [
			"Use when the current goal is complete or cleared and a queued goal is available to start.",
		],
		parameters: EmptyParams,
		async execute() {
			const dequeued = dequeueGoal();
			if (!dequeued) return { content: [{ type: "text" as const, text: "No queued goals." }], details: { goal: getGoal(), telemetry: getTelemetry() } as ToolDetails };
			persistDequeue(pi, "dequeued");
			return { content: [{ type: "text" as const, text: `Dequeued goal: ${dequeued.queueId}\nObjective: ${dequeued.objective}` }], details: { goal: getGoal(), telemetry: getTelemetry(), dequeued } as ToolDetails };
		},
	});

	pi.registerTool({
		name: "remove_queued_goal",
		label: "Remove Queued Goal",
		description: "Remove a specific goal from the queue by its queue ID.",
		promptSnippet: "Remove a specific queued goal by ID.",
		promptGuidelines: [
			"Use only when the user explicitly asks to remove a specific queued goal.",
		],
		parameters: Type.Object({ queueId: Type.String({ description: "Queue ID of the goal to remove" }) }),
		async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
			const removed = removeGoal(params.queueId);
			if (!removed) return errorResult(`No queued goal found with id ${params.queueId}.`);
			persistRemove(pi, params.queueId, "tool_remove");
			return { content: [{ type: "text" as const, text: `Removed queued goal: ${removed.queueId}` }], details: { goal: getGoal(), telemetry: getTelemetry() } as ToolDetails };
		},
	});
}