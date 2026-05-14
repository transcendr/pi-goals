import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { decideTerminalContinuationTicket, dispatchContinuationTicket, revalidateContinuationTicket } from "./continuation-ticket";
import { runPostCompletionActionsSafely, type PostCompletionActionRunner } from "./post-completion-actions";
import { getQueue } from "./queue-state";
import { getGoal } from "./state";
import { syncGoalUi } from "./ui";
import type { GoalState, PiGoalEventReason } from "./types";

export type TerminalGoalWorkflowInput = {
	goal: GoalState | null;
	reason: PiGoalEventReason;
	runner: PostCompletionActionRunner;
	triggerTurn?: boolean;
	force?: boolean;
	deliverAs?: "steer" | "followUp";
};

export async function processTerminalGoalWorkflow(pi: ExtensionAPI, ctx: ExtensionContext, input: TerminalGoalWorkflowInput): Promise<GoalState | null> {
	const ticket = decideTerminalContinuationTicket(input.goal, getQueue(), { triggerTurn: input.triggerTurn, force: input.force, deliverAs: input.deliverAs });
	const afterActions = await runPostCompletionActionsSafely(pi, ctx, input.goal, input.reason, input.runner);
	syncGoalUi(ctx, afterActions);
	const currentGoal = getGoal();
	if (revalidateContinuationTicket(ticket, currentGoal, getQueue()).ok) dispatchContinuationTicket(pi, ticket);
	return afterActions;
}
