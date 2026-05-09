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
		"A queued item is ready to handle. Do not start it blindly; first decide whether it is a direct goal or an orchestration instruction.",
		"",
		`Queue ID: ${goal.queueId}`,
		budgetLine(goal),
		"",
		"Next queued item/objective:",
		preview(goal.objective),
		"",
		"Required next steps:",
		"1. Classify the queue head semantically using current context before calling any queue-start tool.",
		"2. Direct goal: if the text itself is the concrete goal to perform, call start_queued_goal so creation and dequeue are atomic.",
		"3. Orchestration/JIT instruction: if the text asks you to run/create/start another goal, run/create/start a goal template, or create follow-up goals from current context, do NOT call start_queued_goal and do NOT make this prose itself the active goal.",
		"4. For orchestration/JIT, use existing goal tools as appropriate: create_goal, create_goal_from_template, or enqueue_goal. Do not rely on extension-side prose parsing; you, the agent, resolve the intent from context.",
		"5. One orchestration queue item may require one or more consecutive active goals before it is satisfied. Keep this queue item at the head while you execute those concrete goal(s).",
		"6. After the concrete goal(s) requested by this orchestration item are complete/satisfied, call dequeue_goal exactly once to consume this queue item. If you see this same queue item again after satisfying it, dequeue it instead of recreating the same goal.",
		"7. If needed context is missing or a non-complete active goal blocks the next action, leave this queue item in place and continue/resolve the blocker instead of dequeuing it.",
	];
	if (goal.template) {
		lines.push(
			"Structured template metadata: this queue item already stores a reusable template reference.",
			`If classified as a direct goal, start_queued_goal will re-resolve template '${goal.template}' with flags=${JSON.stringify(goal.templateFlags ?? {})}, args=${JSON.stringify(goal.templateArgs ?? "")}.`,
			"If you cannot use the direct path, use create_goal_from_template rather than create_goal, and dequeue only after successful direct creation or completed orchestration satisfaction.",
		);
	} else {
		lines.push(
			"Plain queue entry: use start_queued_goal only if you classified this item as a direct goal.",
			"Example orchestration wording such as 'run/create/start the deslop-commit-range goal template' means use create_goal_from_template (or another existing goal tool), not start_queued_goal.",
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
