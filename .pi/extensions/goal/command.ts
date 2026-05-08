import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { GOAL_USAGE, GOAL_USAGE_HINT } from "./constants";
import { validateObjective } from "./format";
import { createTelemetry, resetSafetyCounters } from "./telemetry";
import {
	createGoalState,
	getGoal,
	getTelemetry,
	persistClearGoal,
	persistSetGoal,
	persistTelemetry,
	persistUpdateGoal,
} from "./state";
import { notifyGoal, notifyInfo, notifyWarning, showGoalSummary, showNoGoal, syncGoalUi } from "./ui";
import type { GoalCommandScheduler, GoalContinuationCanceller, GoalState } from "./types";

export function registerGoalCommand(
	pi: ExtensionAPI,
	scheduleContinuation: GoalCommandScheduler,
	cancelContinuation: GoalContinuationCanceller,
): void {
	pi.registerCommand("goal", {
		description: "Set or view the goal for a long-running task",
		handler: async (args, ctx) => handleGoalCommand(pi, args, ctx, scheduleContinuation, cancelContinuation),
	});
}

async function handleGoalCommand(
	pi: ExtensionAPI,
	args: string,
	ctx: ExtensionCommandContext,
	scheduleContinuation: GoalCommandScheduler,
	cancelContinuation: GoalContinuationCanceller,
): Promise<void> {
	const trimmed = args.trim();
	if (!trimmed) {
		const goal = getGoal();
		if (goal) showGoalSummary(ctx, goal);
		else showNoGoal(ctx);
		return;
	}

	const control = trimmed.toLowerCase();
	if (control === "pause") return pauseGoal(pi, ctx, cancelContinuation);
	if (control === "resume") return resumeGoal(pi, ctx, scheduleContinuation);
	if (control === "clear") return clearGoal(pi, ctx, cancelContinuation);

	await setGoalObjective(pi, trimmed, ctx, scheduleContinuation, cancelContinuation);
}

async function setGoalObjective(
	pi: ExtensionAPI,
	input: string,
	ctx: ExtensionCommandContext,
	scheduleContinuation: GoalCommandScheduler,
	cancelContinuation: GoalContinuationCanceller,
): Promise<void> {
	const validation = validateObjective(input);
	if (!validation.ok) {
		notifyWarning(ctx, validation.hint ? `${validation.message}\n${validation.hint}` : validation.message);
		return;
	}

	const existing = getGoal();
	if (existing) {
		const ok = await ctx.ui.confirm("Replace goal?", `New objective: ${validation.objective}`);
		if (!ok) {
			notifyInfo(ctx, "Goal replacement cancelled. Current goal kept.");
			return;
		}
		cancelContinuation(existing.goalId, "replace");
	}

	const goal = createGoalState(validation.objective);
	const telemetry = createTelemetry(goal.goalId, goal.createdAt);
	persistSetGoal(pi, goal, telemetry, "command");
	syncGoalUi(ctx, goal);
	notifyGoal(ctx, goal);
	scheduleContinuation(ctx, "created");
}

function pauseGoal(pi: ExtensionAPI, ctx: ExtensionCommandContext, cancelContinuation: GoalContinuationCanceller): void {
	const goal = getGoal();
	if (!goal) {
		notifyInfo(ctx, `${GOAL_USAGE}\nNo goal is currently set.`);
		return;
	}
	cancelContinuation(goal.goalId, "pause");
	const paused: GoalState = { ...goal, status: "paused", updatedAt: Date.now() };
	persistUpdateGoal(pi, paused, getTelemetry(), "command");
	syncGoalUi(ctx, paused);
	notifyGoal(ctx, paused);
}

function resumeGoal(pi: ExtensionAPI, ctx: ExtensionCommandContext, scheduleContinuation: GoalCommandScheduler): void {
	const goal = getGoal();
	if (!goal) {
		notifyInfo(ctx, `${GOAL_USAGE}\n${GOAL_USAGE_HINT}`);
		return;
	}
	if (goal.status === "complete") {
		notifyInfo(ctx, "Goal is complete. Use /goal clear before starting a new goal.");
		return;
	}
	const active: GoalState = { ...goal, status: "active", updatedAt: Date.now() };
	const telemetry = resetSafetyCounters(getTelemetry());
	persistUpdateGoal(pi, active, telemetry, "resume");
	if (telemetry) persistTelemetry(pi, telemetry, "resume");
	syncGoalUi(ctx, active);
	notifyGoal(ctx, active);
	scheduleContinuation(ctx, "resumed");
}

function clearGoal(pi: ExtensionAPI, ctx: ExtensionCommandContext, cancelContinuation: GoalContinuationCanceller): void {
	const goal = getGoal();
	const hadGoal = Boolean(goal);
	cancelContinuation(goal?.goalId, "clear");
	const result = persistClearGoal(pi, "command");
	syncGoalUi(ctx, result.goal);
	notifyInfo(ctx, hadGoal ? "Goal cleared" : "No goal to clear\nThis session does not currently have a goal.");
}
