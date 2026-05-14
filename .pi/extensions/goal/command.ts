import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { AutocompleteItem } from "@earendil-works/pi-tui";
import { GOAL_USAGE, GOAL_USAGE_HINT } from "./constants";
import { canActivateGoal, budgetLimitReason } from "./budget";
import { validateObjective, goalStatusLabel } from "./format";
import { discoverGoalTemplates, parseGoalTemplateInvocation } from "./templates";
import { buildDirectGoalIntent, buildTemplateGoalIntent } from "./goal-intent";
import { createPostCompletionActionStates, recordPostStartActionAnchors } from "./post-completion-actions";
import { captureContextResetCommandContext } from "./context-reset";
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
import { parseQueueBlockItems, type QueueBlockItem } from "./queue-block-parser";
import { getQueue, enqueueGoal, persistEnqueue } from "./queue-state";
import { notifyGoal, notifyInfo, notifyWarning, showGoalSummary, showNoGoal, syncGoalUi } from "./ui";
import type { GoalCommandScheduler, GoalContinuationCanceller, GoalMonitorCanceller, GoalMonitorScheduler, GoalPauseInterrupter, GoalQueueSteeringSender, GoalState } from "./types";

type GoalCommandRuntime = {
	scheduleContinuation: GoalCommandScheduler;
	cancelContinuation: GoalContinuationCanceller;
	interruptActiveTurn: GoalPauseInterrupter;
	scheduleMonitor: GoalMonitorScheduler;
	cancelMonitor: GoalMonitorCanceller;
	sendQueueSteering: GoalQueueSteeringSender;
};

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
	runtime: GoalCommandRuntime,
): void {
	pi.registerCommand("goal", {
		description: "Set or view the goal for a long-running task",
		getArgumentCompletions: goalArgumentCompletions,
		handler: async (args, ctx) => handleGoalCommand(pi, args, ctx, runtime),
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
	runtime: GoalCommandRuntime,
): Promise<void> {
	const trimmed = args.trim();
	if (!trimmed) {
		const goal = getGoal();
		if (goal) showGoalSummary(ctx, goal);
		else showNoGoal(ctx);
		return;
	}

	const handled = handleGoalControlCommand(pi, trimmed, ctx, runtime);
	if (handled) return;

	const resolved = resolveTemplateOrObjective(trimmed, ctx);
	if (resolved) await setGoalObjective(pi, resolved, ctx, runtime);
}

function handleGoalControlCommand(
	pi: ExtensionAPI,
	trimmed: string,
	ctx: ExtensionCommandContext,
	runtime: GoalCommandRuntime,
): boolean {
	const firstToken = trimmed.split(/\s+/, 1)[0].toLowerCase();
	if (firstToken === "queue") {
		handleQueueCommand(pi, trimmed, ctx);
		return true;
	}
	if (trimmed === "pause") pauseGoal(pi, ctx, runtime);
	else if (trimmed === "resume") resumeGoal(pi, ctx, runtime);
	else if (trimmed === "clear") clearGoal(pi, ctx, runtime);
	else return false;
	return true;
}

type ResolvedObjectiveInput = {
	objective: string;
	template?: string;
	templateFlags?: Record<string, string>;
	templateArgs?: string;
	postCompletionActions?: import("./types").PostCompletionActionSpec[];
};

function resolveTemplateOrObjective(input: string, ctx: ExtensionCommandContext): ResolvedObjectiveInput | null {
	return resolveTemplateOrObjectiveDetails(input, ctx);
}

function resolveTemplateOrObjectiveDetails(input: string, ctx: ExtensionCommandContext): ResolvedObjectiveInput | null {
	if (parseGoalTemplateInvocation(input)) {
		const templateIntent = buildTemplateGoalIntent({ invocation: input });
		if (templateIntent.ok && templateIntent.intent.kind === "template") return { objective: templateIntent.intent.objective, template: templateIntent.intent.template, templateFlags: templateIntent.intent.flags, templateArgs: templateIntent.intent.args, postCompletionActions: templateIntent.intent.postCompletionActions };
	}
	const directIntent = buildDirectGoalIntent({ objective: input });
	if (directIntent.ok) return { objective: directIntent.intent.objective, postCompletionActions: directIntent.intent.postCompletionActions };
	notifyWarning(ctx, directIntent.error);
	return null;
}

async function setGoalObjective(
	pi: ExtensionAPI,
	input: ResolvedObjectiveInput,
	ctx: ExtensionCommandContext,
	runtime: GoalCommandRuntime,
): Promise<void> {
	if (!input.objective) return;
	captureContextResetCommandContext(ctx);
	const validation = validateObjective(input.objective);
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
				const queued = enqueueGoal(validation.objective, "command", { postCompletionActions: input.postCompletionActions });
				persistEnqueue(pi, queued);
				notifyInfo(ctx, `Queued goal: ${queued.queueId}`);
			} else {
				notifyInfo(ctx, "Goal creation cancelled.");
			}
			return;
		}
		runtime.cancelContinuation(existing.goalId, "replace");
		runtime.cancelMonitor(existing.goalId, "replace");
	}

	let goal = createGoalState({ objective: validation.objective, postCompletionActions: createPostCompletionActionStates(input.postCompletionActions ?? []) });
	goal = recordPostStartActionAnchors(pi, ctx, goal, "command");
	const telemetry = createTelemetry(goal.goalId, goal.createdAt);
	persistSetGoal(pi, goal, telemetry, "command");
	syncGoalUi(ctx, goal);
	notifyGoal(ctx, goal);
	runtime.scheduleMonitor(ctx);
	runtime.scheduleContinuation(ctx, "created");
}

function replacementChoicePrompt(objective: string): string {
	const maxPreviewChars = 4_000;
	const preview = objective.length > maxPreviewChars ? `${objective.slice(0, maxPreviewChars - 1)}…` : objective;
	return `Goal already active. New resolved goal:\n\n${preview}\n\nChoose action:`;
}

function pauseGoal(
	pi: ExtensionAPI,
	ctx: ExtensionCommandContext,
	runtime: GoalCommandRuntime,
): void {
	const goal = getGoal();
	if (!goal) {
		notifyInfo(ctx, `${GOAL_USAGE}\nNo goal is currently set.`);
		return;
	}
	runtime.cancelContinuation(goal.goalId, "pause");
	runtime.cancelMonitor(goal.goalId, "pause");
	const paused: GoalState = { ...goal, status: "paused", updatedAt: Date.now() };
	persistUpdateGoal(pi, paused, getTelemetry(), "command");
	syncGoalUi(ctx, paused);
	notifyGoal(ctx, paused);
	if (!ctx.isIdle()) {
		runtime.interruptActiveTurn(ctx, paused);
		notifyWarning(ctx, "Goal paused. The active turn was interrupted; run /goal resume to continue.");
	}
}

function resumeGoal(pi: ExtensionAPI, ctx: ExtensionCommandContext, runtime: GoalCommandRuntime): void {
	const goal = getGoal();
	const queue = getQueue();
	if (!goal) {
		if (queue.length > 0) {
			runtime.sendQueueSteering("goal-resume", { triggerTurn: true });
			notifyInfo(ctx, `No active goal. Resuming queued goal processing for ${queue.length} queued goal${queue.length > 1 ? "s" : ""}.`);
			return;
		}
		notifyInfo(ctx, `${GOAL_USAGE}\n${GOAL_USAGE_HINT}`);
		return;
	}
	if (goal.status === "complete") {
		if (queue.length > 0) {
			runtime.sendQueueSteering("goal-resume", { triggerTurn: true });
			notifyInfo(ctx, `Goal is complete. Resuming queued goal processing for ${queue.length} queued goal${queue.length > 1 ? "s" : ""}.`);
			return;
		}
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
	runtime.scheduleMonitor(ctx);
	runtime.scheduleContinuation(ctx, "resumed");
}

function clearGoal(pi: ExtensionAPI, ctx: ExtensionCommandContext, runtime: GoalCommandRuntime): void {
	const goal = getGoal();
	const hadGoal = Boolean(goal);
	runtime.cancelContinuation(goal?.goalId, "clear");
	runtime.cancelMonitor(goal?.goalId, "clear");
	const result = persistClearGoal(pi, "command");
	syncGoalUi(ctx, result.goal);
	const queue = getQueue();
	if (queue.length > 0) runtime.sendQueueSteering("goal-clear");
	const queueHint = queue.length > 0 ? `\n${queue.length} queued goal${queue.length > 1 ? "s" : ""} available. Queue steering was sent to the agent context.` : "";
	notifyInfo(ctx, hadGoal ? `Goal cleared${queueHint}` : `No goal to clear\nThis session does not currently have a goal.${queueHint}`);
}

function handleQueueCommand(pi: ExtensionAPI, input: string, ctx: ExtensionCommandContext): void {
	const rest = input.slice("queue".length).trim();
	if (!rest) {
		const queue = getQueue();
		if (queue.length === 0) {
			notifyInfo(ctx, "No queued goals.");
			return;
		}
		const lines = queue.map((g, i) => `${i + 1}. [${g.queueId}] ${truncateObjective(g.objective)}`);
		notifyInfo(ctx, `Queued goals (${queue.length}):\n${lines.join("\n")}`);
		return;
	}

	const blockItems = parseQueueBlockItems(rest);
	if (blockItems) {
		const validatedItems = resolveAndValidateQueueItems(blockItems, ctx);
		if (!validatedItems) return;
		const queued = validatedItems.map((item) => {
			const goal = enqueueGoal(item.objective, "command", { template: item.template, templateFlags: item.templateFlags, templateArgs: item.templateArgs, postCompletionActions: item.postCompletionActions });
			persistEnqueue(pi, goal);
			return goal;
		});
		const lines = queued.map((g, i) => `${i + 1}. [${g.queueId}] ${truncateObjective(g.objective)}`);
		notifyInfo(ctx, `Queued ${queued.length} goals:\n${lines.join("\n")}`);
		return;
	}

	const resolved = resolveTemplateOrObjectiveDetails(rest, ctx);
	if (!resolved) return;
	const validation = validateObjective(resolved.objective);
	if (!validation.ok) {
		notifyWarning(ctx, validation.hint ? `${validation.message}\n${validation.hint}` : validation.message);
		return;
	}
	const queued = enqueueGoal(validation.objective, "command", { template: resolved.template, templateFlags: resolved.templateFlags, templateArgs: resolved.templateArgs, postCompletionActions: resolved.postCompletionActions });
	persistEnqueue(pi, queued);
	notifyInfo(ctx, `Queued goal: ${queued.queueId} \u2014 ${truncateObjective(validation.objective)}`);
}

function truncateObjective(objective: string): string {
	return objective.length > 80 ? `${objective.slice(0, 77)}\u2026` : objective;
}

function resolveAndValidateQueueItems(items: QueueBlockItem[], ctx: ExtensionCommandContext): ResolvedObjectiveInput[] | null {
	const resolvedItems: ResolvedObjectiveInput[] = [];
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		const resolved = resolveTemplateOrObjectiveDetails(item.objectiveInput, ctx);
		if (!resolved) {
			notifyWarning(ctx, `Queue item ${i + 1} (${item.marker} on line ${item.lineIndex + 1}) could not be resolved. No goals were queued.`);
			return null;
		}
		const validation = validateObjective(resolved.objective);
		if (!validation.ok) {
			const message = validation.hint ? `${validation.message}\n${validation.hint}` : validation.message;
			notifyWarning(ctx, `Queue item ${i + 1} (${item.marker} on line ${item.lineIndex + 1}) is invalid. No goals were queued.\n${message}`);
			return null;
		}
		resolvedItems.push({ ...resolved, objective: validation.objective });
	}
	return resolvedItems;
}
