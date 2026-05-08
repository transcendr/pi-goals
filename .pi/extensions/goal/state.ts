import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { STATE_ENTRY_TYPE, STATE_EVENT_VERSION } from "./constants";
import { isTelemetry } from "./telemetry";
import type { GoalRuntimeState, GoalState, GoalTelemetrySnapshot, MutationResult, PiGoalEventReason, PiGoalStateEvent } from "./types";

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

export function createGoalState(objective: string, tokenBudget?: number, timeBudgetSeconds?: number, now = Date.now()): GoalState {
	return {
		goalId: crypto.randomUUID(),
		objective,
		status: "active",
		tokenBudget,
		timeBudgetSeconds,
		tokensUsed: 0,
		timeUsedSeconds: 0,
		createdAt: now,
		updatedAt: now,
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
	const goal = isGoalState(event.goal) ? event.goal : state.goal;
	const telemetry = event.telemetry === null ? null : isTelemetry(event.telemetry) ? event.telemetry : state.telemetry;
	return { goal, telemetry };
}

function entryToGoalEvent(entry: unknown): PiGoalStateEvent | null {
	const candidate = entry as { type?: string; customType?: string; data?: unknown };
	if (candidate.type !== "custom" || candidate.customType !== STATE_ENTRY_TYPE) return null;
	return isGoalEvent(candidate.data) ? candidate.data : null;
}

function isGoalEvent(value: unknown): value is PiGoalStateEvent {
	if (!value || typeof value !== "object") return false;
	const v = value as Partial<PiGoalStateEvent>;
	return v.version === STATE_EVENT_VERSION && typeof v.kind === "string" && typeof v.reason === "string";
}

function isGoalState(value: unknown): value is GoalState {
	if (!value || typeof value !== "object") return false;
	const v = value as Partial<GoalState>;
	return typeof v.goalId === "string" && typeof v.objective === "string" && typeof v.status === "string";
}
