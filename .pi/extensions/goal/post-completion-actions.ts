import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { persistUpdateGoal } from "./state";
import { notifyWarning } from "./ui";
import type { GoalState, PiGoalEventReason, PostCompletionActionSpec, PostCompletionActionState } from "./types";

export type PostCompletionActionRunInput = { goal: GoalState; action: PostCompletionActionState; ctx: ExtensionContext };
export type PostCompletionActionRunResult =
	| { ok: true; actionId: string; status: "done" | "skipped"; message?: string }
	| { ok: false; actionId: string; status: "failed"; message: string; severity: "warning" };

export type PostCompletionActionRunner = {
	run(input: PostCompletionActionRunInput): Promise<PostCompletionActionRunResult>;
};

export function createPostCompletionActionStates(specs: PostCompletionActionSpec[], now = Date.now()): PostCompletionActionState[] {
	return specs.map((spec, index) => ({ ...spec, id: `post-${now}-${index + 1}`, status: "pending", updatedAt: now }));
}

export function getRunnablePostCompletionActions(goal: GoalState): PostCompletionActionState[] {
	if (goal.status !== "complete") return [];
	return (goal.postCompletionActions ?? []).filter((action) => action.status === "pending");
}

export function recordPostStartActionAnchors(_pi: ExtensionAPI, ctx: ExtensionContext, goal: GoalState, _reason: PiGoalEventReason): GoalState {
	const leafId = ctx.sessionManager.getLeafId?.();
	const actions = (goal.postCompletionActions ?? []).map((action) => action.type === "context.reset" && !action.anchorEntryId ? { ...action, anchorEntryId: leafId ?? undefined, updatedAt: Date.now() } : action);
	if (!actionsChanged(goal.postCompletionActions, actions)) return goal;
	return { ...goal, postCompletionActions: actions, updatedAt: Date.now() };
}

export async function runPostCompletionActionsSafely(pi: ExtensionAPI, ctx: ExtensionContext, goal: GoalState | null, reason: PiGoalEventReason, runner: PostCompletionActionRunner): Promise<GoalState | null> {
	let current = goal;
	if (!current) return null;
	for (const action of getRunnablePostCompletionActions(current)) {
		current = persistActionState(pi, current, { ...action, status: "running", updatedAt: Date.now() }, reason);
		const running = current.postCompletionActions?.find((candidate) => candidate.id === action.id) ?? action;
		let result: PostCompletionActionRunResult;
		try {
			result = await runner.run({ goal: current, action: running, ctx });
		} catch (error) {
			result = { ok: false, actionId: action.id, status: "failed", message: error instanceof Error ? error.message : String(error), severity: "warning" };
		}
		const completed = completeActionState(running, result);
		current = persistActionState(pi, current, completed, reason);
		if (!result.ok) notifyWarning(ctx, `Post-completion action ${running.type} failed but goal/queue continuation will continue: ${result.message}`);
	}
	return current;
}

export function createNoopPostCompletionActionRunner(disabledReason: string): PostCompletionActionRunner {
	return { async run(input) { return { ok: true, actionId: input.action.id, status: "skipped", message: disabledReason }; } };
}

function completeActionState(action: PostCompletionActionState, result: PostCompletionActionRunResult): PostCompletionActionState {
	const now = Date.now();
	if (result.ok && result.status === "done") return { ...action, status: "done", completedAt: now, updatedAt: now };
	if (result.ok) return { ...action, status: "skipped", skippedReason: result.message, completedAt: now, updatedAt: now };
	return { ...action, status: "failed", failure: result.message, completedAt: now, updatedAt: now };
}

function persistActionState(pi: ExtensionAPI, goal: GoalState, action: PostCompletionActionState, reason: PiGoalEventReason): GoalState {
	const actions = (goal.postCompletionActions ?? []).map((candidate) => candidate.id === action.id ? action : candidate);
	const updated = { ...goal, postCompletionActions: actions, updatedAt: Date.now() };
	persistUpdateGoal(pi, updated, null, reason);
	return updated;
}

function actionsChanged(previous: PostCompletionActionState[] | undefined, next: PostCompletionActionState[]): boolean {
	return JSON.stringify(previous ?? []) !== JSON.stringify(next);
}
