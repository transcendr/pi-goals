import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { queueHandoffReason } from "./budget";
import { sendQueueHandoff } from "./queue-steering";
import { cloneQueuedGoal, getQueueRevision, type QueuedGoal } from "./queue-state";
import type { GoalQueueSteeringReason, GoalState } from "./types";

export type ContinuationTicket =
	| { kind: "queueHandoff"; reason: GoalQueueSteeringReason; goalId: string; queueId: string; queuedGoal: QueuedGoal; queueRevision: number; triggerTurn?: boolean; deliverAs?: "steer" | "followUp"; force?: boolean }
	| { kind: "none"; reason: string };

export type ContinuationTicketOptions = { triggerTurn?: boolean; deliverAs?: "steer" | "followUp"; force?: boolean; queueRevision?: number };

export function decideTerminalContinuationTicket(goal: GoalState | null, queue: QueuedGoal[], opts: ContinuationTicketOptions = {}): ContinuationTicket {
	const reason = queueHandoffReason(goal);
	const head = queue[0];
	if (!goal) return { kind: "none", reason: "missing_goal" };
	if (!reason) return { kind: "none", reason: "goal_not_terminal_for_queue_handoff" };
	if (!head) return { kind: "none", reason: "queue_empty" };
	return { kind: "queueHandoff", reason, goalId: goal.goalId, queueId: head.queueId, queuedGoal: cloneQueuedGoal(head), queueRevision: opts.queueRevision ?? getQueueRevision(), triggerTurn: opts.triggerTurn, deliverAs: opts.deliverAs, force: opts.force };
}

export function revalidateContinuationTicket(ticket: ContinuationTicket, goal: GoalState | null, queue: QueuedGoal[]): { ok: true } | { ok: false; reason: string } {
	if (ticket.kind === "none") return { ok: false, reason: ticket.reason };
	if (!goal) return { ok: false, reason: "missing_goal" };
	if (goal.goalId !== ticket.goalId) return { ok: false, reason: "goal_changed" };
	if (queue[0]?.queueId !== ticket.queueId) return { ok: false, reason: "queue_head_changed" };
	if (getQueueRevision() !== ticket.queueRevision) return { ok: false, reason: "queue_revision_changed" };
	if (queueHandoffReason(goal) !== ticket.reason) return { ok: false, reason: "terminal_reason_changed" };
	return { ok: true };
}

export function refreshContinuationTicketQueueRevision(ticket: ContinuationTicket): ContinuationTicket {
	if (ticket.kind === "none") return ticket;
	return { ...ticket, queueRevision: getQueueRevision() };
}

export function dispatchContinuationTicket(pi: ExtensionAPI, ticket: ContinuationTicket): boolean {
	if (ticket.kind === "none") return false;
	return sendQueueHandoff(pi, ticket.reason, { goalId: ticket.goalId, triggerTurn: ticket.triggerTurn, deliverAs: ticket.deliverAs, force: ticket.force });
}
