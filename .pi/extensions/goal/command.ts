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
import { sendQueueSteering } from "./queue-steering";
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
	if (/^queue\s/.test(query)) return templateCompletions(query.slice("queue".length).trimStart(), "queue ");
	if (/\s/.test(query)) return null;
	const scored = GOAL_SUBCOMMANDS.map((subcommand) => ({
		...subcommand,
		score: subcommandScore(subcommand.name, query),
	})).filter((item): item is GoalSubcommand & { score: number } => item.score !== undefined);
	scored.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
	const subcommands = scored.map(({ name, description }) => ({ value: name, label: name, description }));
	return [...subcommands, ...templateCompletions(query)];
}

function templateCompletions(query: string, valuePrefix = ""): AutocompleteItem[] {
	if (/\s/.test(query)) return [];
	return discoverGoalTemplates()
		.filter((template) => template.name.toLowerCase().includes(query.toLowerCase()) || template.aliases.some((alias) => alias.toLowerCase().includes(query.toLowerCase())))
		.slice(0, 20)
		.map((template) => ({ value: `${valuePrefix}${template.name}`, label: template.name, description: template.description ?? `Goal template from ${template.path}` }));
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

	const handled = handleGoalControlCommand(pi, trimmed, ctx, scheduleContinuation, cancelContinuation, interruptActiveTurn, scheduleMonitor, cancelMonitor);
	if (handled) return;

	await setGoalObjective(pi, resolveTemplateOrObjective(trimmed, ctx), ctx, scheduleContinuation, cancelContinuation, scheduleMonitor, cancelMonitor);
}

function handleGoalControlCommand(
	pi: ExtensionAPI,
	trimmed: string,
	ctx: ExtensionCommandContext,
	scheduleContinuation: GoalCommandScheduler,
	cancelContinuation: GoalContinuationCanceller,
	interruptActiveTurn: GoalPauseInterrupter,
	scheduleMonitor: GoalMonitorScheduler,
	cancelMonitor: GoalMonitorCanceller,
): boolean {
	const firstToken = trimmed.split(/\s+/, 1)[0].toLowerCase();
	if (firstToken === "queue") {
		handleQueueCommand(pi, trimmed, ctx);
		return true;
	}
	if (trimmed === "pause") pauseGoal(pi, ctx, cancelContinuation, interruptActiveTurn, cancelMonitor);
	else if (trimmed === "resume") resumeGoal(pi, ctx, scheduleContinuation, scheduleMonitor);
	else if (trimmed === "clear") clearGoal(pi, ctx, cancelContinuation, cancelMonitor);
	else return false;
	return true;
}

type ResolvedObjectiveInput = {
	objective: string;
	template?: string;
	templateFlags?: Record<string, string>;
	templateArgs?: string;
};

function resolveTemplateOrObjective(input: string, ctx: ExtensionCommandContext): string {
	return resolveTemplateOrObjectiveDetails(input, ctx)?.objective ?? "";
}

function resolveTemplateOrObjectiveDetails(input: string, ctx: ExtensionCommandContext): ResolvedObjectiveInput | null {
	const resolution = resolveGoalTemplateInvocation(input);
	if (resolution.ok) {
		return {
			objective: resolution.template.objective,
			template: resolution.template.name,
			templateFlags: resolution.template.flags,
			templateArgs: resolution.template.args,
		};
	}
	if ("notTemplate" in resolution) return { objective: input };
	notifyWarning(ctx, resolution.error);
	return null;
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
		const choice = await ctx.ui.select(replacementChoicePrompt(validation.objective), choices);
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

function replacementChoicePrompt(objective: string): string {
	const maxPreviewChars = 4_000;
	const preview = objective.length > maxPreviewChars ? `${objective.slice(0, maxPreviewChars - 1)}…` : objective;
	return `Goal already active. New resolved goal:\n\n${preview}\n\nChoose action:`;
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
	if (queue.length > 0) sendQueueSteering(pi, "goal-clear");
	const queueHint = queue.length > 0 ? `\n${queue.length} queued goal${queue.length > 1 ? "s" : ""} available. Queue steering was sent to the agent context.` : "";
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
	const resolved = resolveTemplateOrObjectiveDetails(rest, ctx);
	if (!resolved) return;
	const validation = validateObjective(resolved.objective);
	if (!validation.ok) {
		notifyWarning(ctx, validation.hint ? `${validation.message}\n${validation.hint}` : validation.message);
		return;
	}
	const queued = enqueueGoal(validation.objective, "command", { template: resolved.template, templateFlags: resolved.templateFlags, templateArgs: resolved.templateArgs });
	persistEnqueue(pi, queued);
	notifyInfo(ctx, `Queued goal: ${queued.queueId} \u2014 ${validation.objective.length > 80 ? validation.objective.slice(0, 77) + "\u2026" : validation.objective}`);
}
