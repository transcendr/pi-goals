import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { STATE_ENTRY_TYPE, STATE_EVENT_VERSION } from "./constants";
import { isTelemetry } from "./telemetry";
import type { ContextResetMode, GoalRuntimeState, GoalState, GoalTelemetrySnapshot, MutationResult, PiGoalEventReason, PiGoalStateEvent, PostCompletionActionState, PostCompletionActionStatus } from "./types";

export type CreateGoalStateInput = {
	objective: string;
	tokenBudget?: number;
	timeBudgetSeconds?: number;
	minTokensBeforeWrapUp?: number;
	minTimeSecondsBeforeWrapUp?: number;
	postCompletionActions?: GoalState["postCompletionActions"];
	sourceQueueId?: string;
	now?: number;
};

let runtimeState: GoalRuntimeState = { goal: null, telemetry: null };

export function getGoal(): GoalState | null {
	return runtimeState.goal;
}

export function getTelemetry(): GoalTelemetrySnapshot | null {
	return runtimeState.telemetry;
}

export function getRuntimeState(): GoalRuntimeState {
	return { goal: runtimeState.goal, telemetry: runtimeState.telemetry };
}

export function replayGoalState(ctx: ExtensionContext): GoalRuntimeState {
	let next: GoalRuntimeState = { goal: null, telemetry: null };
	for (const entry of ctx.sessionManager.getBranch()) {
		const event = entryToGoalEvent(entry);
		if (!event) continue;
		next = applyEvent(next, event);
	}
	runtimeState = next;
	return getRuntimeState();
}

export function setRuntimeStateForTests(state: GoalRuntimeState): void {
	runtimeState = state;
}

export function createGoalState(input: CreateGoalStateInput): GoalState {
	const now = input.now ?? Date.now();
	return {
		goalId: crypto.randomUUID(),
		objective: input.objective,
		status: "active",
		tokenBudget: input.tokenBudget,
		timeBudgetSeconds: input.timeBudgetSeconds,
		minTokensBeforeWrapUp: input.minTokensBeforeWrapUp,
		minTimeSecondsBeforeWrapUp: input.minTimeSecondsBeforeWrapUp,
		tokensUsed: 0,
		timeUsedSeconds: 0,
		createdAt: now,
		updatedAt: now,
		sourceQueueId: input.sourceQueueId,
		postCompletionActions: input.postCompletionActions,
	};
}

export function persistSetGoal(
	pi: ExtensionAPI,
	goal: GoalState,
	telemetry: GoalTelemetrySnapshot,
	reason: PiGoalEventReason,
): MutationResult {
	return persistEvent(pi, { kind: "set", goalId: goal.goalId, goal, telemetry, reason });
}

export function persistUpdateGoal(
	pi: ExtensionAPI,
	goal: GoalState,
	telemetry: GoalTelemetrySnapshot | null,
	reason: PiGoalEventReason,
): MutationResult {
	if (runtimeState.goal && runtimeState.goal.goalId !== goal.goalId) {
		return { ok: false, goal: runtimeState.goal, telemetry: runtimeState.telemetry, message: "Stale goal update ignored." };
	}
	return persistEvent(pi, { kind: "update", goalId: goal.goalId, goal, telemetry, reason });
}

export function persistTelemetry(
	pi: ExtensionAPI,
	telemetry: GoalTelemetrySnapshot | null,
	reason: PiGoalEventReason,
): MutationResult {
	const goal = runtimeState.goal;
	if (!goal || !telemetry || telemetry.goalId !== goal.goalId) {
		return { ok: false, goal, telemetry: runtimeState.telemetry, message: "Stale telemetry update ignored." };
	}
	return persistEvent(pi, { kind: "telemetry", goalId: goal.goalId, goal, telemetry, reason });
}

export function persistAccountGoal(
	pi: ExtensionAPI,
	goalId: string,
	delta: { timeUsedSeconds?: number; tokensUsed?: number },
	telemetry: GoalTelemetrySnapshot | null,
	reason: PiGoalEventReason,
): MutationResult {
	const current = runtimeState.goal;
	if (!current || current.goalId !== goalId) {
		return { ok: false, goal: current, telemetry: runtimeState.telemetry, message: "Stale accounting ignored." };
	}
	const goal: GoalState = {
		...current,
		timeUsedSeconds: current.timeUsedSeconds + Math.max(0, Math.floor(delta.timeUsedSeconds ?? 0)),
		tokensUsed: current.tokensUsed + Math.max(0, Math.floor(delta.tokensUsed ?? 0)),
		updatedAt: Date.now(),
	};
	return persistEvent(pi, { kind: "account", goalId, goal, telemetry, delta, reason });
}

export function persistClearGoal(pi: ExtensionAPI, reason: PiGoalEventReason): MutationResult {
	return persistEvent(pi, { kind: "clear", goalId: runtimeState.goal?.goalId, goal: null, telemetry: null, reason });
}

function persistEvent(
	pi: ExtensionAPI,
	input: Omit<PiGoalStateEvent, "version" | "at">,
): MutationResult {
	const event: PiGoalStateEvent = { version: STATE_EVENT_VERSION, at: Date.now(), ...input };
	pi.appendEntry(STATE_ENTRY_TYPE, event);
	runtimeState = applyEvent(runtimeState, event);
	return { ok: true, goal: runtimeState.goal, telemetry: runtimeState.telemetry };
}

function applyEvent(state: GoalRuntimeState, event: PiGoalStateEvent): GoalRuntimeState {
	if (event.kind === "clear") return { goal: null, telemetry: null };
	if (event.goalId && state.goal && event.goalId !== state.goal.goalId && event.kind !== "set") return state;
	const parsedGoal = toGoalState(event.goal);
	const goal = parsedGoal ?? state.goal;
	const telemetry = event.telemetry === null ? null : isTelemetry(event.telemetry) ? event.telemetry : state.telemetry;
	return { goal, telemetry };
}

function entryToGoalEvent(entry: unknown): PiGoalStateEvent | null {
	if (typeof entry !== "object" || entry === null) return null;
	const candidate = entry as Record<string, unknown>;
	if (candidate.type !== "custom" || candidate.customType !== STATE_ENTRY_TYPE) return null;
	return isGoalEvent(candidate.data) ? candidate.data : null;
}

function isGoalEvent(value: unknown): value is PiGoalStateEvent {
	if (typeof value !== "object" || value === null) return false;
	const v = value as Record<string, unknown>;
	return v.version === STATE_EVENT_VERSION && typeof v.kind === "string" && typeof v.reason === "string";
}

function toGoalState(value: unknown): GoalState | null {
	if (typeof value !== "object" || value === null) return null;
	const v = value as Record<string, unknown>;
	const required = requiredGoalFields(v);
	if (!required) return null;
	const legacyContext = parseContextResetMode(v.postCompletionContext);
	const legacyStatus = parseActionStatus(v.contextResetStatus);
	return {
		goalId: required.goalId,
		objective: required.objective,
		status: required.status,
		tokenBudget: optionalPositiveInteger(v.tokenBudget),
		timeBudgetSeconds: optionalPositiveInteger(v.timeBudgetSeconds),
		minTokensBeforeWrapUp: optionalPositiveInteger(v.minTokensBeforeWrapUp),
		minTimeSecondsBeforeWrapUp: optionalPositiveInteger(v.minTimeSecondsBeforeWrapUp),
		tokensUsed: finiteNumber(v.tokensUsed) ?? 0,
		timeUsedSeconds: finiteNumber(v.timeUsedSeconds) ?? 0,
		createdAt: finiteNumber(v.createdAt) ?? Date.now(),
		updatedAt: finiteNumber(v.updatedAt) ?? Date.now(),
		sourceQueueId: optionalString(v.sourceQueueId),
		postCompletionActions: parsePostCompletionActionStates(v.postCompletionActions, required.goalId, legacyContext, legacyStatus, v),
		postCompletionContext: legacyContext,
		contextResetAnchorEntryId: optionalString(v.contextResetAnchorEntryId),
		contextResetStatus: legacyStatus,
		contextResetFailure: optionalString(v.contextResetFailure),
		contextResetCompletedAt: finiteNumber(v.contextResetCompletedAt),
	};
}

function requiredGoalFields(value: Record<string, unknown>): Pick<GoalState, "goalId" | "objective" | "status"> | null {
	if (typeof value.goalId !== "string" || typeof value.objective !== "string") return null;
	if (value.status !== "active" && value.status !== "paused" && value.status !== "budgetLimited" && value.status !== "complete") return null;
	return { goalId: value.goalId, objective: value.objective, status: value.status };
}

function parsePostCompletionActionStates(value: unknown, goalId: string, legacyContext: ContextResetMode | "none" | undefined, legacyStatus: PostCompletionActionStatus | undefined, raw: Record<string, unknown>): PostCompletionActionState[] | undefined {
	if (Array.isArray(value)) return parseActionStateArray(value);
	if (!legacyContext || legacyContext === "none") return undefined;
	return [{
		id: `legacy-context-reset-${goalId}`,
		type: "context.reset",
		mode: legacyContext,
		status: legacyStatus ?? "pending",
		anchorEntryId: optionalString(raw.contextResetAnchorEntryId),
		failure: optionalString(raw.contextResetFailure),
		completedAt: finiteNumber(raw.contextResetCompletedAt),
		updatedAt: finiteNumber(raw.updatedAt),
	}];
}

function parseActionStateArray(values: unknown[]): PostCompletionActionState[] | undefined {
	const parsed: PostCompletionActionState[] = [];
	for (const value of values) {
		const action = parseActionState(value);
		if (!action) return undefined;
		parsed.push(action);
	}
	return parsed;
}

function parseActionState(value: unknown): PostCompletionActionState | null {
	if (typeof value !== "object" || value === null) return null;
	const raw = value as Record<string, unknown>;
	const status = parseActionStatus(raw.status);
	if (typeof raw.id !== "string" || raw.type !== "context.reset" || !status) return null;
	const mode = parseContextResetMode(raw.mode);
	if (mode !== "clear" && mode !== "summarize") return null;
	return {
		id: raw.id,
		type: "context.reset",
		mode,
		status,
		anchorEntryId: optionalString(raw.anchorEntryId),
		failure: optionalString(raw.failure),
		skippedReason: optionalString(raw.skippedReason),
		completedAt: finiteNumber(raw.completedAt),
		updatedAt: finiteNumber(raw.updatedAt),
	};
}

function parseContextResetMode(value: unknown): ContextResetMode | "none" | undefined {
	if (value === "clear" || value === "summarize" || value === "none") return value;
	return undefined;
}

function parseActionStatus(value: unknown): PostCompletionActionStatus | undefined {
	if (value === "pending" || value === "running" || value === "done" || value === "failed" || value === "skipped") return value;
	return undefined;
}

function optionalPositiveInteger(value: unknown): number | undefined {
	return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function finiteNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function optionalString(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}
