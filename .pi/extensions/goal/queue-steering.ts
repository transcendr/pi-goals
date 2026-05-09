import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { QUEUE_MESSAGE_TYPE, QUEUE_PROMPT_ID } from "./constants";
import { getQueue, type QueuedGoal } from "./queue-state";

export type QueueSteeringReason = "goal-complete" | "goal-clear";

const OBJECTIVE_PREVIEW_CHARS = 4_000;

export function sendQueueSteering(pi: ExtensionAPI, reason: QueueSteeringReason): boolean {
	const next = getQueue()[0];
	if (!next) return false;
	pi.sendMessage(
		{
			customType: QUEUE_MESSAGE_TYPE,
			content: queueSteeringContent(next),
			display: false,
			details: { kind: "queueNext", promptId: QUEUE_PROMPT_ID, queueId: next.queueId, reason, createdAt: Date.now() },
		},
		{ deliverAs: "steer" },
	);
	return true;
}

export function queueSteeringStillValid(message: Record<string, unknown>): boolean {
	const details = typeof message.details === "object" && message.details !== null ? message.details as Record<string, unknown> : null;
	const queueId = details?.queueId;
	return typeof queueId === "string" && getQueue()[0]?.queueId === queueId;
}

function queueSteeringContent(goal: QueuedGoal): string {
	const lines = [
		"A queued goal is ready to start now. Continue immediately by starting the next queued goal.",
		"",
		`Queue ID: ${goal.queueId}`,
		budgetLine(goal),
		"",
		"Next queued objective:",
		preview(goal.objective),
		"",
		"Required next steps:",
	];
	if (goal.template) {
		lines.push(
			"1. Use start_queued_goal to atomically create this goal and remove it from the queue only after creation succeeds.",
			`2. This queued request came from reusable template '${goal.template}'; start_queued_goal will re-resolve it with flags=${JSON.stringify(goal.templateFlags ?? {})}, args=${JSON.stringify(goal.templateArgs ?? "")}.`,
			"3. If you cannot use start_queued_goal, use create_goal_from_template rather than create_goal, and dequeue only after successful creation.",
		);
	} else {
		lines.push(
			"1. Use start_queued_goal to atomically create this goal and remove it from the queue only after creation succeeds.",
			"2. If start_queued_goal reports a non-complete active goal, leave this queued goal in place and continue the active goal.",
		);
	}
	return lines.filter((line) => line !== undefined).join("\n");
}

function budgetLine(goal: QueuedGoal): string {
	const parts = [];
	if (goal.tokenBudget !== undefined) parts.push(`token_budget=${goal.tokenBudget}`);
	if (goal.timeBudgetSeconds !== undefined) parts.push(`time_budget_seconds=${goal.timeBudgetSeconds}`);
	return parts.length ? `Budgets: ${parts.join(", ")}` : "Budgets: none";
}

function preview(objective: string): string {
	return objective.length > OBJECTIVE_PREVIEW_CHARS ? `${objective.slice(0, OBJECTIVE_PREVIEW_CHARS - 1)}…` : objective;
}
