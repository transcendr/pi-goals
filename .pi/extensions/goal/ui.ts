import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { GOAL_USAGE, GOAL_USAGE_HINT, STATUS_UI_KEY, WIDGET_UI_KEY } from "./constants";
import { footerStatusText, formatTimeResource, formatTokenResource, goalSummaryLines, goalUsageSummary, objectiveExcerpt, statusLabel, commandHint } from "./format";
import type { GoalState } from "./types";

export function syncGoalUi(ctx: ExtensionContext, goal: GoalState | null): void {
	if (!goal) {
		ctx.ui.setStatus(STATUS_UI_KEY, undefined);
		ctx.ui.setWidget(WIDGET_UI_KEY, undefined);
		return;
	}
	ctx.ui.setStatus(STATUS_UI_KEY, footerStatusText(goal));
	ctx.ui.setWidget(WIDGET_UI_KEY, widgetLines(goal), { placement: "aboveEditor" });
}

export function showNoGoal(ctx: ExtensionContext): void {
	ctx.ui.notify(`${GOAL_USAGE}\n${GOAL_USAGE_HINT}`, "info");
}

export function showGoalSummary(ctx: ExtensionContext, goal: GoalState): void {
	ctx.ui.notify(goalSummaryLines(goal).join("\n"), "info");
}

export function notifyGoal(ctx: ExtensionContext, goal: GoalState, prefix = "Goal"): void {
	ctx.ui.notify(`${prefix} ${statusLabel(goal.status)}\n${goalUsageSummary(goal)}`, "info");
}

export function notifyInfo(ctx: ExtensionContext, message: string): void {
	ctx.ui.notify(message, "info");
}

export function notifyWarning(ctx: ExtensionContext, message: string): void {
	ctx.ui.notify(message, "warning");
}

export async function promptResumePausedGoal(ctx: ExtensionContext, goal: GoalState): Promise<boolean> {
	const choice = await ctx.ui.select("Resume paused goal?", ["Resume goal", "Leave paused"]);
	return choice === "Resume goal";
}

function widgetLines(goal: GoalState): string[] {
	return [
		`pi-goal: ${statusLabel(goal.status)}`,
		`Objective: ${objectiveExcerpt(goal.objective)}`,
		formatTimeResource(goal),
		formatTokenResource(goal),
		commandHint(goal.status),
	];
}
