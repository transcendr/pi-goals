import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { decideTerminalContinuationTicket, dispatchContinuationTicket, refreshContinuationTicketQueueRevision, revalidateContinuationTicket, type ContinuationTicket } from "./continuation-ticket";
import { logCompactionDebug } from "./debug-log";
import { runPostCompletionActionsSafely, type PostCompletionActionRunner } from "./post-completion-actions";
import { consumeQueueIdForRepair, getQueue, restoreQueueHeadForRepair } from "./queue-state";
import { getGoal } from "./state";
import { syncGoalUi } from "./ui";
import type { GoalState, PiGoalEventReason, PostCompletionActionState } from "./types";

export type TerminalGoalWorkflowInput = {
	goal: GoalState | null;
	reason: PiGoalEventReason;
	runner: PostCompletionActionRunner;
	triggerTurn?: boolean;
	force?: boolean;
	deliverAs?: "steer" | "followUp";
};

export async function processTerminalGoalWorkflow(pi: ExtensionAPI, ctx: ExtensionContext, input: TerminalGoalWorkflowInput): Promise<GoalState | null> {
	let ticket = decideTerminalContinuationTicket(input.goal, getQueue(), { triggerTurn: input.triggerTurn, force: input.force, deliverAs: input.deliverAs });
	const beforeActions = input.goal?.postCompletionActions;
	const afterActions = await runPostCompletionActionsSafely(pi, ctx, input.goal, input.reason, input.runner);
	if (completedContextResetNavigation(beforeActions, afterActions?.postCompletionActions)) ticket = repairContinuationQueueAfterReset(pi, input.goal, ticket);
	syncGoalUi(ctx, afterActions);
	const currentGoal = getGoal();
	if (revalidateContinuationTicket(ticket, currentGoal, getQueue()).ok) dispatchContinuationTicket(pi, ticket);
	return afterActions;
}

function repairContinuationQueueAfterReset(pi: ExtensionAPI, goal: GoalState | null, ticket: ContinuationTicket): ContinuationTicket {
	if (goal?.sourceQueueId) {
		const sourceConsume = consumeQueueIdForRepair(pi, goal.sourceQueueId, "post_completion_context_reset_source_queue_repair");
		logCompactionDebug("terminalWorkflow.contextResetRepair.consumeSource", { status: sourceConsume.status, queueId: goal.sourceQueueId });
	}
	if (ticket.kind === "none") return ticket;
	const restored = restoreQueueHeadForRepair(pi, ticket.queuedGoal, "post_completion_context_reset_queue_handoff_repair");
	logCompactionDebug("terminalWorkflow.contextResetRepair.restoreHead", { status: restored.status, queueId: ticket.queueId, currentHeadId: restored.status === "blocked_different_head" ? restored.currentHeadId : undefined });
	return refreshContinuationTicketQueueRevision(ticket);
}

function completedContextResetNavigation(before: PostCompletionActionState[] | undefined, after: PostCompletionActionState[] | undefined): boolean {
	for (const action of after ?? []) {
		if (action.type !== "context.reset" || action.status !== "done") continue;
		const previous = before?.find((candidate) => candidate.id === action.id);
		if (!previous || previous.status !== "done") return true;
	}
	return false;
}
