import type { ContextResetMode, PostCompletionActionSpec } from "./types";
import { parseGoalTemplateInvocation, resolveGoalTemplateByName } from "./templates";

export type GoalBudgetSpec = {
	tokenBudget?: number;
	timeBudgetSeconds?: number;
	minTokensBeforeWrapUp?: number;
	minTimeSecondsBeforeWrapUp?: number;
};

export type GoalIntent =
	| { kind: "direct"; objective: string; budgets?: GoalBudgetSpec; postCompletionActions: PostCompletionActionSpec[] }
	| { kind: "template"; template: string; flags: Record<string, string>; args: string; objective: string; budgets?: GoalBudgetSpec; postCompletionActions: PostCompletionActionSpec[] };

export type GoalIntentResult = { ok: true; intent: GoalIntent } | { ok: false; error: string };
export type ActionSpecResult = { ok: true; actions: PostCompletionActionSpec[] } | { ok: false; error: string };
export type ParsedDirectiveResult = { objective: string; action?: PostCompletionActionSpec };

export type PostCompletionActionInput = {
	postCompletionContext?: "none" | ContextResetMode;
	postCompletionActions?: PostCompletionActionSpec[];
};

export type DirectGoalIntentInput = PostCompletionActionInput & { objective: string; budgets?: GoalBudgetSpec };
export type TemplateGoalIntentInput = PostCompletionActionInput & { invocation: string; budgets?: GoalBudgetSpec };

const TRAILING_DIRECTIVE = /(?:\s+and\s+(summarize|clear)(?:\s+the)?\s+context)\s*[.!?]?\s*$/i;

export function parseTrailingPostCompletionDirective(input: string): ParsedDirectiveResult {
	const match = input.match(TRAILING_DIRECTIVE);
	if (!match) return { objective: input.trim() };
	const mode: ContextResetMode = match[1].toLowerCase() === "clear" ? "clear" : "summarize";
	return { objective: input.slice(0, match.index).trim(), action: { type: "context.reset", mode } };
}

export function normalizePostCompletionActionSpecs(input: PostCompletionActionInput): ActionSpecResult {
	const context = input.postCompletionContext;
	if (context === "none" && input.postCompletionActions && input.postCompletionActions.length > 0) {
		return { ok: false, error: "post_completion_context none conflicts with post_completion_actions." };
	}
	const fromContext: PostCompletionActionSpec[] = context && context !== "none" ? [{ type: "context.reset", mode: context }] : [];
	return mergePostCompletionActionSpecs(fromContext, input.postCompletionActions ?? []);
}

export function mergePostCompletionActionSpecs(left: PostCompletionActionSpec[], right: PostCompletionActionSpec[]): ActionSpecResult {
	let mode: ContextResetMode | undefined;
	for (const action of [...left, ...right]) {
		if (action.type !== "context.reset") return { ok: false, error: `Unsupported post-completion action type: ${String(action.type)}.` };
		if (action.mode !== "clear" && action.mode !== "summarize") return { ok: false, error: "context.reset mode must be clear or summarize." };
		if (mode && mode !== action.mode) return { ok: false, error: `Conflicting context.reset actions: ${mode} and ${action.mode}.` };
		mode = action.mode;
	}
	return { ok: true, actions: mode ? [{ type: "context.reset", mode }] : [] };
}

export function buildDirectGoalIntent(input: DirectGoalIntentInput): GoalIntentResult {
	const parsed = parseTrailingPostCompletionDirective(input.objective);
	const actions = normalizeIntentActions(parsed.action, input);
	if (!actions.ok) return actions;
	return { ok: true, intent: { kind: "direct", objective: parsed.objective, budgets: input.budgets, postCompletionActions: actions.actions } };
}

export function buildTemplateGoalIntent(input: TemplateGoalIntentInput): GoalIntentResult {
	const parsedInvocation = parseGoalTemplateInvocation(input.invocation);
	if (!parsedInvocation) return { ok: false, error: "Template invocation is empty or invalid." };
	const parsedArgs = parseTrailingPostCompletionDirective(parsedInvocation.args);
	const actions = normalizeIntentActions(parsedArgs.action, input);
	if (!actions.ok) return actions;
	const resolved = resolveGoalTemplateByName(parsedInvocation.name, parsedInvocation.flags, parsedArgs.objective);
	if (!resolved.ok) return "notTemplate" in resolved ? { ok: false, error: `Unknown goal template '${parsedInvocation.name}'.` } : { ok: false, error: resolved.error };
	return { ok: true, intent: { kind: "template", template: resolved.template.name, flags: resolved.template.flags, args: parsedArgs.objective, objective: resolved.template.objective, budgets: input.budgets, postCompletionActions: actions.actions } };
}

function normalizeIntentActions(parsedAction: PostCompletionActionSpec | undefined, input: PostCompletionActionInput): ActionSpecResult {
	if (parsedAction && input.postCompletionContext === "none") return { ok: false, error: "post_completion_context none conflicts with trailing post-completion context directive." };
	const explicit = normalizePostCompletionActionSpecs(input);
	if (!explicit.ok) return explicit;
	return mergePostCompletionActionSpecs(parsedAction ? [parsedAction] : [], explicit.actions);
}
