import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { AutocompleteItem } from "@earendil-works/pi-tui";
import { GOAL_USAGE, GOAL_USAGE_HINT } from "./constants";
import { canActivateGoal, budgetLimitReason } from "./budget";
import { validateObjective, goalStatusLabel } from "./format";
import { discoverGoalTemplates, resolveGoalTemplateInvocation } from "./templates";
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
import { getQueue, enqueueGoal, persistEnqueue } from "./queue-state";
import { notifyGoal, notifyInfo, notifyWarning, showGoalSummary, showNoGoal, syncGoalUi } from "./ui";
import type { GoalCommandScheduler, GoalContinuationCanceller, GoalMonitorCanceller, GoalMonitorScheduler, GoalPauseInterrupter, GoalState } from "./types";

type GoalSubcommand = {
	name: "pause" | "resume" | "clear" | "queue";
	description: string;
};

const GOAL_SUBCOMMANDS: GoalSubcommand[] = [
	{ name: "pause", description: "Pause the current goal" },
	{ name: "resume", description: "Resume a paused goal" },
	{ name: "clear", description: "Clear the current goal" },
	{ name: "queue", description: "List queued goals or enqueue a new goal" },
];

export function registerGoalCommand(
	pi: ExtensionAPI,
	scheduleContinuation: GoalCommandScheduler,
	cancelContinuation: GoalContinuationCanceller,
	interruptActiveTurn: GoalPauseInterrupter,
	scheduleMonitor: GoalMonitorScheduler,
	cancelMonitor: GoalMonitorCanceller,
): void {
	pi.registerCommand("goal", {
		description: "Set or view the goal for a long-running task",
		getArgumentCompletions: goalArgumentCompletions,
		handler: async (args, ctx) => handleGoalCommand(pi, args, ctx, scheduleContinuation, cancelContinuation, interruptActiveTurn, scheduleMonitor, cancelMonitor),
	});
}

export function goalArgumentCompletions(argumentPrefix: string): AutocompleteItem[] | null {
	const query = argumentPrefix.trimStart();
	if (/\s/.test(query)) return null;
	const scored = GOAL_SUBCOMMANDS.map((subcommand) => ({
		...subcommand,
		score: subcommandScore(subcommand.name, query),
	})).filter((item): item is GoalSubcommand & { score: number } => item.score !== undefined);
	scored.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
	const subcommands = scored.map(({ name, description }) => ({ value: name, label: name, description }));
	const templates = discoverGoalTemplates()
		.filter((template) => template.name.toLowerCase().includes(query.toLowerCase()) || template.aliases.some((alias) => alias.toLowerCase().includes(query.toLowerCase())))
		.slice(0, 20)
		.map((template) => ({ value: template.name, label: template.name, description: template.description ?? `Goal template from ${template.path}` }));
	return [...subcommands, ...templates];
}

function subcommandScore(value: string, query: string): number | undefined {
	const normalized = query.toLowerCase();
	if (!normalized) return 0;
	if (value.startsWith(normalized)) return 1;
	if (value.includes(normalized)) return 2;
	return isOrderedMatch(value, normalized) ? 3 : undefined;
}

function isOrderedMatch(value: string, query: string): boolean {
	let index = 0;
	for (const char of query) {
		index = value.indexOf(char, index);
		if (index < 0) return false;
		index++;
	}
	return true;
}

async function handleGoalCommand(
	pi: ExtensionAPI,
	args: string,
	ctx: ExtensionCommandContext,
	scheduleContinuation: GoalCommandScheduler,
	cancelContinuation: GoalContinuationCanceller,
	interruptActiveTurn: GoalPauseInterrupter,
	scheduleMonitor: GoalMonitorScheduler,
	cancelMonitor: GoalMonitorCanceller,
): Promise<void> {
	const trimmed = args.trim();
	if (!trimmed) {
		const goal = getGoal();
		if (goal) showGoalSummary(ctx, goal);
		else showNoGoal(ctx);
		return;
	}

	const control = GOAL_SUBCOMMANDS.find((subcommand) => subcommand.name === trimmed.toLowerCase())?.name;
	if (control === "pause") return pauseGoal(pi, ctx, cancelContinuation, interruptActiveTurn, cancelMonitor);
	if (control === "resume") return resumeGoal(pi, ctx, scheduleContinuation, scheduleMonitor);
	if (control === "clear") return clearGoal(pi, ctx, cancelContinuation, cancelMonitor);
	if (control === "queue") return handleQueueCommand(pi, trimmed, ctx);

	await setGoalObjective(pi, resolveTemplateOrObjective(trimmed, ctx), ctx, scheduleContinuation, cancelContinuation, scheduleMonitor, cancelMonitor);
}

function resolveTemplateOrObjective(input: string, ctx: ExtensionCommandContext): string {
	const resolution = resolveGoalTemplateInvocation(input);
	if (resolution.ok) return resolution.template.objective;
	if ("notTemplate" in resolution) return input;
	notifyWarning(ctx, resolution.error);
	return "";
}

async function setGoalObjective(
	pi: ExtensionAPI,
	input: string,
	ctx: ExtensionCommandContext,
	scheduleContinuation: GoalCommandScheduler,
	cancelContinuation: GoalContinuationCanceller,
	scheduleMonitor: GoalMonitorScheduler,
	cancelMonitor: GoalMonitorCanceller,
): Promise<void> {
	if (!input) return;
	const validation = validateObjective(input);
	if (!validation.ok) {
		notifyWarning(ctx, validation.hint ? `${validation.message}\n${validation.hint}` : validation.message);
		return;
	}

	const existing = getGoal();
	if (existing) {
		const choices = ["Replace", "Queue", "Cancel"];
		const choice = await ctx.ui.select("Goal already active. Choose action:", choices);
		if (choice === "Queue" || choice === "Cancel") {
			if (choice === "Queue") {
				const queued = enqueueGoal(validation.objective, "command");
				persistEnqueue(pi, queued);
				notifyInfo(ctx, `Queued goal: ${queued.queueId}`);
			} else {
				notifyInfo(ctx, "Goal creation cancelled.");
			}
			return;
		}
		cancelContinuation(existing.goalId, "replace");
		cancelMonitor(existing.goalId, "replace");
	}

	const goal = createGoalState(validation.objective);
	const telemetry = createTelemetry(goal.goalId, goal.createdAt);
	persistSetGoal(pi, goal, telemetry, "command");
	syncGoalUi(ctx, goal);
	notifyGoal(ctx, goal);
	scheduleMonitor(ctx);
	scheduleContinuation(ctx, "created");
}

function pauseGoal(
	pi: ExtensionAPI,
	ctx: ExtensionCommandContext,
	cancelContinuation: GoalContinuationCanceller,
	interruptActiveTurn: GoalPauseInterrupter,
	cancelMonitor: GoalMonitorCanceller,
): void {
	const goal = getGoal();
	if (!goal) {
		notifyInfo(ctx, `${GOAL_USAGE}\nNo goal is currently set.`);
		return;
	}
	cancelContinuation(goal.goalId, "pause");
	cancelMonitor(goal.goalId, "pause");
	const paused: GoalState = { ...goal, status: "paused", updatedAt: Date.now() };
	persistUpdateGoal(pi, paused, getTelemetry(), "command");
	syncGoalUi(ctx, paused);
	notifyGoal(ctx, paused);
	if (!ctx.isIdle()) {
		interruptActiveTurn(ctx, paused);
		notifyWarning(ctx, "Goal paused. The active turn was interrupted; run /goal resume to continue.");
	}
}

function resumeGoal(pi: ExtensionAPI, ctx: ExtensionCommandContext, scheduleContinuation: GoalCommandScheduler, scheduleMonitor: GoalMonitorScheduler): void {
	const goal = getGoal();
	if (!goal) {
		notifyInfo(ctx, `${GOAL_USAGE}\n${GOAL_USAGE_HINT}`);
		return;
	}
	if (goal.status === "complete") {
		notifyInfo(ctx, "Goal is complete. Use /goal clear before starting a new goal.");
		return;
	}
	if (!canActivateGoal(goal)) {
		const reason = budgetLimitReason(goal);
		const resource = reason === "tokenBudget" ? "token" : reason === "timeBudget" ? "time" : "budget";
		notifyWarning(ctx, `Cannot resume: ${resource} budget is still exhausted. Raise the budget or use /goal clear before resuming.`);
		return;
	}
	const active: GoalState = { ...goal, status: "active", updatedAt: Date.now() };
	const telemetry = resetSafetyCounters(getTelemetry());
	persistUpdateGoal(pi, active, telemetry, "resume");
	if (telemetry) persistTelemetry(pi, telemetry, "resume");
	syncGoalUi(ctx, active);
	notifyGoal(ctx, active);
	scheduleMonitor(ctx);
	scheduleContinuation(ctx, "resumed");
}

function clearGoal(pi: ExtensionAPI, ctx: ExtensionCommandContext, cancelContinuation: GoalContinuationCanceller, cancelMonitor: GoalMonitorCanceller): void {
	const goal = getGoal();
	const hadGoal = Boolean(goal);
	cancelContinuation(goal?.goalId, "clear");
	cancelMonitor(goal?.goalId, "clear");
	const result = persistClearGoal(pi, "command");
	syncGoalUi(ctx, result.goal);
	const queue = getQueue();
	const queueHint = queue.length > 0 ? `\n${queue.length} queued goal${queue.length > 1 ? "s" : ""} available. Use /goal queue to list or /goal <objective> to start the next one.` : "";
	notifyInfo(ctx, hadGoal ? `Goal cleared${queueHint}` : `No goal to clear\nThis session does not currently have a goal.${queueHint}`);
}

function handleQueueCommand(pi: ExtensionAPI, input: string, ctx: ExtensionCommandContext): void {
	const rest = input.slice("queue".length).trim();
	const queue = getQueue();
	if (!rest) {
		if (queue.length === 0) {
			notifyInfo(ctx, "No queued goals.");
			return;
		}
		const lines = queue.map((g, i) => `${i + 1}. [${g.queueId}] ${g.objective.length > 80 ? g.objective.slice(0, 77) + "\u2026" : g.objective}`);
		notifyInfo(ctx, `Queued goals (${queue.length}):\n${lines.join("\n")}`);
		return;
	}
	const resolved = resolveTemplateOrObjective(rest, ctx);
	if (!resolved) return;
	const validation = validateObjective(resolved);
	if (!validation.ok) {
		notifyWarning(ctx, validation.hint ? `${validation.message}\n${validation.hint}` : validation.message);
		return;
	}
	const queued = enqueueGoal(validation.objective, "command");
	persistEnqueue(pi, queued);
	notifyInfo(ctx, `Queued goal: ${queued.queueId} \u2014 ${validation.objective.length > 80 ? validation.objective.slice(0, 77) + "\u2026" : validation.objective}`);
}
