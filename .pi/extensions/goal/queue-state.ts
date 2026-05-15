import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { STATE_ENTRY_TYPE } from "./constants";
import type { PostCompletionActionSpec } from "./types";

export type QueuedGoal = {
	queueId: string;
	objective: string;
	tokenBudget?: number;
	timeBudgetSeconds?: number;
	minTokensBeforeWrapUp?: number;
	minTimeSecondsBeforeWrapUp?: number;
	source: "command" | "tool";
	template?: string;
	templateFlags?: Record<string, string>;
	templateArgs?: string;
	postCompletionActions?: PostCompletionActionSpec[];
	postCompletionContext?: "none" | "clear" | "summarize";
	createdAt: number;
};

export type DequeueAudit = {
	rationale: string;
	authority: string;
};

export type QueueRepairResult =
	| { status: "restored"; queueId: string }
	| { status: "already_present"; queueId: string }
	| { status: "blocked_different_head"; queueId: string; currentHeadId: string }
	| { status: "consumed"; queueId: string }
	| { status: "not_found"; queueId: string };

type DequeuePersistMetadata = {
	queueId?: string;
	audit?: DequeueAudit;
};

type GoalQueueEvent = {
	version: 1;
	kind: "enqueue" | "dequeue" | "remove" | "repairHead";
	queueId?: string;
	goal?: QueuedGoal | null;
	reason: string;
	rationale?: string;
	authority?: string;
	at: number;
};

type QueueEventRecord = {
	kind: unknown;
	queueId?: unknown;
	goal?: unknown;
	reason: string;
	rationale?: unknown;
	authority?: unknown;
	at: number;
};

type ParsedOptionalField<T> = { ok: true; value: T | undefined } | { ok: false };

export type GoalQueueRuntimeState = {
	queue: QueuedGoal[];
	revision?: number;
};

let queueCounter = 0;
let runtimeQueue: QueuedGoal[] = [];
let runtimeQueueRevision = 0;

function generateQueueId(): string {
	return `q-${Date.now()}-${++queueCounter}`;
}

export function getQueue(): QueuedGoal[] {
	return runtimeQueue;
}

export function getQueueRevision(): number {
	return runtimeQueueRevision;
}

export function cloneQueuedGoal(goal: QueuedGoal): QueuedGoal {
	return {
		...goal,
		templateFlags: goal.templateFlags ? { ...goal.templateFlags } : undefined,
		postCompletionActions: goal.postCompletionActions ? goal.postCompletionActions.map((action) => ({ ...action })) : undefined,
	};
}

export function enqueueGoal(objective: string, source: "command" | "tool", opts?: { tokenBudget?: number; timeBudgetSeconds?: number; minTokensBeforeWrapUp?: number; minTimeSecondsBeforeWrapUp?: number; template?: string; templateFlags?: Record<string, string>; templateArgs?: string; postCompletionActions?: PostCompletionActionSpec[]; postCompletionContext?: "none" | "clear" | "summarize" }): QueuedGoal {
	const goal: QueuedGoal = {
		queueId: generateQueueId(),
		objective,
		tokenBudget: opts?.tokenBudget,
		timeBudgetSeconds: opts?.timeBudgetSeconds,
		minTokensBeforeWrapUp: opts?.minTokensBeforeWrapUp,
		minTimeSecondsBeforeWrapUp: opts?.minTimeSecondsBeforeWrapUp,
		source,
		template: opts?.template,
		templateFlags: opts?.templateFlags,
		templateArgs: opts?.templateArgs,
		postCompletionActions: opts?.postCompletionActions,
		postCompletionContext: opts?.postCompletionContext,
		createdAt: Date.now(),
	};
	runtimeQueue.push(goal);
	incrementQueueRevision();
	return goal;
}

export function dequeueGoal(): QueuedGoal | undefined {
	const removed = runtimeQueue.shift();
	if (removed) incrementQueueRevision();
	return removed;
}

export function removeGoal(queueId: string): QueuedGoal | undefined {
	const index = runtimeQueue.findIndex((g) => g.queueId === queueId);
	if (index === -1) return undefined;
	const removed = runtimeQueue.splice(index, 1)[0];
	if (removed) incrementQueueRevision();
	return removed;
}

export function restoreQueueHeadForRepair(pi: ExtensionAPI, goal: QueuedGoal, reason: string): QueueRepairResult {
	const head = runtimeQueue[0];
	if (head?.queueId === goal.queueId) return { status: "already_present", queueId: goal.queueId };
	if (head) return { status: "blocked_different_head", queueId: goal.queueId, currentHeadId: head.queueId };
	const restored = cloneQueuedGoal(goal);
	runtimeQueue.unshift(restored);
	incrementQueueRevision();
	persistRepairHead(pi, restored, reason);
	return { status: "restored", queueId: restored.queueId };
}

export function consumeQueueIdForRepair(pi: ExtensionAPI, queueId: string, reason: string): QueueRepairResult {
	const removed = removeGoal(queueId);
	if (!removed) return { status: "not_found", queueId };
	persistDequeue(pi, reason, { queueId });
	return { status: "consumed", queueId };
}

export function replayQueueState(ctx: { sessionManager: { getBranch(): unknown[] } }): GoalQueueRuntimeState {
	let queue: QueuedGoal[] = [];
	let revision = 0;
	for (const entry of ctx.sessionManager.getBranch()) {
		const event = entryToQueueEvent(entry);
		if (!event) continue;
		queue = applyQueueEvent(queue, event);
		revision++;
	}
	runtimeQueue = queue;
	runtimeQueueRevision = revision;
	return { queue, revision };
}

export function setQueueForTests(state: GoalQueueRuntimeState): void {
	runtimeQueue = state.queue;
	runtimeQueueRevision = state.revision ?? 0;
}

export function persistEnqueue(pi: ExtensionAPI, goal: QueuedGoal): void {
	pi.appendEntry(STATE_ENTRY_TYPE, { version: 1, kind: "enqueue", queueId: goal.queueId, goal, reason: "enqueue", at: Date.now() } as GoalQueueEvent);
}

export function persistDequeue(pi: ExtensionAPI, reason: string, metadata: DequeuePersistMetadata = {}): void {
	pi.appendEntry(STATE_ENTRY_TYPE, { version: 1, kind: "dequeue", queueId: metadata.queueId, reason, rationale: metadata.audit?.rationale, authority: metadata.audit?.authority, at: Date.now() } as GoalQueueEvent);
}

export function persistRemove(pi: ExtensionAPI, queueId: string, reason: string): void {
	pi.appendEntry(STATE_ENTRY_TYPE, { version: 1, kind: "remove", queueId, reason, at: Date.now() } as GoalQueueEvent);
}

function persistRepairHead(pi: ExtensionAPI, goal: QueuedGoal, reason: string): void {
	pi.appendEntry(STATE_ENTRY_TYPE, { version: 1, kind: "repairHead", queueId: goal.queueId, goal, reason, at: Date.now() } as GoalQueueEvent);
}

function incrementQueueRevision(): void {
	runtimeQueueRevision++;
}

function entryToQueueEvent(entry: unknown): GoalQueueEvent | null {
	const raw = toQueueEventRecord(entry);
	if (!raw) return null;
	if (raw.kind === "enqueue" || raw.kind === "repairHead") return parseGoalBearingEvent(raw);
	if (raw.kind === "dequeue" || raw.kind === "remove") return parseQueueOpEvent(raw);
	return null;
}

function toQueueEventRecord(entry: unknown): QueueEventRecord | null {
	if (typeof entry !== "object" || entry === null) return null;
	const candidate = entry as Record<string, unknown>;
	if (candidate.type !== "custom" || candidate.customType !== STATE_ENTRY_TYPE) return null;
	const data = candidate.data;
	if (typeof data !== "object" || data === null) return null;
	const raw = data as Record<string, unknown>;
	if (raw.version !== 1) return null;
	const reason = toRequiredString(raw.reason);
	const at = toFiniteNumber(raw.at);
	if (!reason || at === undefined) return null;
	return {
		kind: raw.kind,
		queueId: raw.queueId,
		goal: raw.goal,
		reason,
		rationale: raw.rationale,
		authority: raw.authority,
		at,
	};
}

function parseGoalBearingEvent(raw: QueueEventRecord): GoalQueueEvent | null {
	if (raw.kind !== "enqueue" && raw.kind !== "repairHead") return null;
	const goal = toQueuedGoal(raw.goal);
	if (!goal) return null;
	const queueId = toOptionalString(raw.queueId) ?? goal.queueId;
	return {
		version: 1,
		kind: raw.kind,
		queueId,
		goal,
		reason: raw.reason,
		rationale: toOptionalString(raw.rationale),
		authority: toOptionalString(raw.authority),
		at: raw.at,
	};
}

function parseQueueOpEvent(raw: QueueEventRecord): GoalQueueEvent | null {
	if (raw.kind !== "dequeue" && raw.kind !== "remove") return null;
	return {
		version: 1,
		kind: raw.kind,
		queueId: toOptionalString(raw.queueId),
		reason: raw.reason,
		rationale: toOptionalString(raw.rationale),
		authority: toOptionalString(raw.authority),
		at: raw.at,
	};
}

function toQueuedGoal(value: unknown): QueuedGoal | null {
	if (typeof value !== "object" || value === null) return null;
	const raw = value as Record<string, unknown>;
	const queueId = toRequiredString(raw.queueId);
	const objective = toRequiredString(raw.objective);
	const source = toQueueSource(raw.source);
	const createdAt = toFiniteNumber(raw.createdAt);
	if (!queueId || !objective || !source || createdAt === undefined) return null;

	const tokenBudget = parseOptionalPositiveIntegerField(raw.tokenBudget);
	if (!tokenBudget.ok) return null;
	const timeBudgetSeconds = parseOptionalPositiveIntegerField(raw.timeBudgetSeconds);
	if (!timeBudgetSeconds.ok) return null;
	const minTokensBeforeWrapUp = parseOptionalPositiveIntegerField(raw.minTokensBeforeWrapUp);
	if (!minTokensBeforeWrapUp.ok) return null;
	const minTimeSecondsBeforeWrapUp = parseOptionalPositiveIntegerField(raw.minTimeSecondsBeforeWrapUp);
	if (!minTimeSecondsBeforeWrapUp.ok) return null;
	const templateFlags = parseOptionalStringRecordField(raw.templateFlags);
	if (!templateFlags.ok) return null;
	const template = parseOptionalStringField(raw.template);
	if (!template.ok) return null;
	const templateArgs = parseOptionalStringField(raw.templateArgs);
	if (!templateArgs.ok) return null;
	const postCompletion = parseQueuedPostCompletion(raw);
	if (!postCompletion.ok) return null;

	return {
		queueId,
		objective,
		tokenBudget: tokenBudget.value,
		timeBudgetSeconds: timeBudgetSeconds.value,
		minTokensBeforeWrapUp: minTokensBeforeWrapUp.value,
		minTimeSecondsBeforeWrapUp: minTimeSecondsBeforeWrapUp.value,
		source,
		template: template.value,
		templateFlags: templateFlags.value,
		templateArgs: templateArgs.value,
		postCompletionActions: postCompletion.actions,
		postCompletionContext: postCompletion.context,
		createdAt,
	};
}

function parseOptionalPositiveIntegerField(value: unknown): ParsedOptionalField<number> {
	if (value === undefined) return { ok: true, value: undefined };
	if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) return { ok: false };
	return { ok: true, value };
}

function parseOptionalStringRecordField(value: unknown): ParsedOptionalField<Record<string, string>> {
	if (value === undefined) return { ok: true, value: undefined };
	if (typeof value !== "object" || value === null || Array.isArray(value)) return { ok: false };
	const result: Record<string, string> = {};
	for (const [key, entry] of Object.entries(value)) {
		if (typeof entry !== "string") return { ok: false };
		result[key] = entry;
	}
	return { ok: true, value: result };
}

function parseOptionalStringField(value: unknown): ParsedOptionalField<string> {
	if (value === undefined) return { ok: true, value: undefined };
	if (typeof value !== "string") return { ok: false };
	return { ok: true, value };
}

function parseQueuedPostCompletion(raw: Record<string, unknown>): { ok: true; context: "none" | "clear" | "summarize" | undefined; actions: PostCompletionActionSpec[] | undefined } | { ok: false } {
	const context = parseOptionalContextField(raw.postCompletionContext);
	if (!context.ok) return { ok: false };
	const actions = parseOptionalActionSpecs(raw.postCompletionActions, context.value);
	return actions.ok ? { ok: true, context: context.value, actions: actions.value } : { ok: false };
}

function parseOptionalContextField(value: unknown): ParsedOptionalField<"none" | "clear" | "summarize"> {
	if (value === undefined) return { ok: true, value: undefined };
	if (value === "none" || value === "clear" || value === "summarize") return { ok: true, value };
	return { ok: false };
}

function parseOptionalActionSpecs(value: unknown, legacyContext: "none" | "clear" | "summarize" | undefined): ParsedOptionalField<PostCompletionActionSpec[]> {
	if (value === undefined) return { ok: true, value: legacyContext && legacyContext !== "none" ? [{ type: "context.reset", mode: legacyContext }] : undefined };
	if (!Array.isArray(value)) return { ok: false };
	const actions: PostCompletionActionSpec[] = [];
	for (const item of value) {
		if (typeof item !== "object" || item === null) return { ok: false };
		const action = item as Record<string, unknown>;
		if (action.type !== "context.reset" || (action.mode !== "clear" && action.mode !== "summarize")) return { ok: false };
		actions.push({ type: "context.reset", mode: action.mode });
	}
	return { ok: true, value: actions };
}

function toRequiredString(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

function toQueueSource(value: unknown): "command" | "tool" | undefined {
	if (value === "command" || value === "tool") return value;
	return undefined;
}

function toFiniteNumber(value: unknown): number | undefined {
	if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
	return value;
}

function toOptionalString(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

function applyQueueEvent(queue: QueuedGoal[], event: GoalQueueEvent): QueuedGoal[] {
	const next = [...queue];
	if (event.kind === "enqueue") {
		if (event.goal) next.push(event.goal);
		return next;
	}
	if (event.kind === "repairHead") {
		if (event.goal) repairHeadByEvent(next, event.goal);
		return next;
	}
	if (event.kind === "dequeue") {
		dequeueByEvent(next, event.queueId);
		return next;
	}
	if (event.kind === "remove") removeByQueueId(next, event.queueId);
	return next;
}

function repairHeadByEvent(queue: QueuedGoal[], goal: QueuedGoal): void {
	if (queue[0]?.queueId === goal.queueId) return;
	if (queue.length > 0) return;
	queue.unshift(goal);
}

function dequeueByEvent(queue: QueuedGoal[], queueId: string | undefined): void {
	if (!queueId || queue[0]?.queueId === queueId) {
		queue.shift();
		return;
	}
	removeByQueueId(queue, queueId);
}

function removeByQueueId(queue: QueuedGoal[], queueId: string | undefined): void {
	if (!queueId) return;
	const index = queue.findIndex((goal) => goal.queueId === queueId);
	if (index !== -1) queue.splice(index, 1);
}
