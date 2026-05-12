import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { QUEUE_MESSAGE_TYPE, QUEUE_PROMPT_ID } from "./constants";
import { getQueue, type QueuedGoal } from "./queue-state";
import type { GoalQueueSteeringReason } from "./types";

const OBJECTIVE_PREVIEW_CHARS = 4_000;

export type QueueHandoffOptions = { triggerTurn?: boolean; goalId?: string; deliverAs?: "steer" | "followUp" };

let lastQueueHandoffKey: string | undefined;

export function sendQueueHandoff(pi: ExtensionAPI, reason: GoalQueueSteeringReason, opts: QueueHandoffOptions = {}): boolean {
	const next = getQueue()[0];
	if (!next) return false;
	const key = `${reason}:${opts.goalId ?? "none"}:${next.queueId}`;
	if (lastQueueHandoffKey === key) return false;
	const sent = sendQueueSteering(pi, reason, { deliverAs: opts.deliverAs, triggerTurn: opts.triggerTurn ?? true });
	if (sent) lastQueueHandoffKey = key;
	return sent;
}

export function sendQueueSteering(pi: ExtensionAPI, reason: GoalQueueSteeringReason, opts: { triggerTurn?: boolean; deliverAs?: "steer" | "followUp" } = {}): boolean {
	const next = getQueue()[0];
	if (!next) return false;
	pi.sendMessage(
		{
			customType: QUEUE_MESSAGE_TYPE,
			content: queueSteeringContent(next),
			display: false,
			details: { kind: "queueNext", promptId: QUEUE_PROMPT_ID, queueId: next.queueId, reason, createdAt: Date.now() },
		},
		{ deliverAs: opts.deliverAs ?? "steer", triggerTurn: opts.triggerTurn },
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
		"A queued item is ready to resolve. Do not start it blindly; first decide whether it should be handled by an existing reusable goal prompt or as a direct one-off goal.",
		"",
		`Queue ID: ${goal.queueId}`,
		budgetLine(goal),
		...budgetGuidance(goal),
		"",
		"Next queued item/objective:",
		preview(goal.objective),
		"",
		"Required next steps:",
		"1. Classify the queue head semantically using current context before calling any queue-start tool.",
		"2. Reusable-prompt check: if the text names a prompt/template, uses a prompt-like slug, or describes a reusable workflow/task type, call list_goal_templates and compare the queue text with template names, aliases, descriptions, and required placeholders.",
		"3. If exactly one reusable template fits and required values can be derived from the queue text or current context, use create_goal_from_template. Do NOT call start_queued_goal and do NOT make the prose itself the active goal.",
		"4. If a likely template fits but required values are missing, ask for or gather the missing context. Leave this queue item in place until resolved.",
		"5. Direct goal fallback: call start_queued_goal only when no reusable template fits, or when the text itself is clearly the concrete one-off goal to perform.",
		"6. For orchestration/JIT work, use existing goal tools as appropriate: create_goal, create_goal_from_template, or enqueue_goal. Do not rely on extension-side prose parsing; you, the agent, resolve the intent from context.",
		"7. One orchestration queue item may require one or more consecutive active goals before it is satisfied. Keep this queue item at the head while you execute those concrete goal(s).",
		"8. After the concrete goal(s) requested by this orchestration item are complete/satisfied, call dequeue_goal exactly once to consume this queue item. If you see this same queue item again after satisfying it, dequeue it instead of recreating the same goal.",
		"9. If needed context is missing or a non-complete active goal blocks the next action, leave this queue item in place and continue/resolve the blocker instead of dequeuing it.",
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
	if (goal.minTokensBeforeWrapUp !== undefined) parts.push(`min_tokens_before_wrap_up=${goal.minTokensBeforeWrapUp}`);
	if (goal.minTimeSecondsBeforeWrapUp !== undefined) parts.push(`min_time_seconds_before_wrap_up=${goal.minTimeSecondsBeforeWrapUp}`);
	return parts.length ? `Budgets: ${parts.join(", ")}` : "Budgets: none";
}

function budgetGuidance(goal: QueuedGoal): string[] {
	const hasBudgetMetadata = goal.tokenBudget !== undefined || goal.timeBudgetSeconds !== undefined || goal.minTokensBeforeWrapUp !== undefined || goal.minTimeSecondsBeforeWrapUp !== undefined;
	if (!hasBudgetMetadata) return ["Budget guidance: Budgets: none means omit budget/floor params. Do not pass token_budget, time_budget_seconds, min_tokens_before_wrap_up, or min_time_seconds_before_wrap_up when creating the next goal."];
	return ["Budget guidance: carry only the listed budget/floor metadata exactly. Do not invent token_budget, time_budget_seconds, min_tokens_before_wrap_up, or min_time_seconds_before_wrap_up values."];
}

function preview(objective: string): string {
	return objective.length > OBJECTIVE_PREVIEW_CHARS ? `${objective.slice(0, OBJECTIVE_PREVIEW_CHARS - 1)}…` : objective;
}
