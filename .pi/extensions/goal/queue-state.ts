import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { STATE_ENTRY_TYPE } from "./constants";

export type QueuedGoal = {
	queueId: string;
	objective: string;
	tokenBudget?: number;
	timeBudgetSeconds?: number;
	source: "command" | "tool";
	template?: string;
	templateFlags?: Record<string, string>;
	templateArgs?: string;
	createdAt: number;
};

export type DequeueAudit = {
	rationale: string;
	authority: string;
};

type DequeuePersistMetadata = {
	queueId?: string;
	audit?: DequeueAudit;
};

type GoalQueueEvent = {
	version: 1;
	kind: "enqueue" | "dequeue" | "remove";
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
};

let queueCounter = 0;
let runtimeQueue: QueuedGoal[] = [];

function generateQueueId(): string {
	return `q-${Date.now()}-${++queueCounter}`;
}

export function getQueue(): QueuedGoal[] {
	return runtimeQueue;
}

export function enqueueGoal(objective: string, source: "command" | "tool", opts?: { tokenBudget?: number; timeBudgetSeconds?: number; template?: string; templateFlags?: Record<string, string>; templateArgs?: string }): QueuedGoal {
	const goal: QueuedGoal = {
		queueId: generateQueueId(),
		objective,
		tokenBudget: opts?.tokenBudget,
		timeBudgetSeconds: opts?.timeBudgetSeconds,
		source,
		template: opts?.template,
		templateFlags: opts?.templateFlags,
		templateArgs: opts?.templateArgs,
		createdAt: Date.now(),
	};
	runtimeQueue.push(goal);
	return goal;
}

export function dequeueGoal(): QueuedGoal | undefined {
	return runtimeQueue.shift();
}

export function removeGoal(queueId: string): QueuedGoal | undefined {
	const index = runtimeQueue.findIndex((g) => g.queueId === queueId);
	if (index === -1) return undefined;
	return runtimeQueue.splice(index, 1)[0];
}

export function replayQueueState(ctx: { sessionManager: { getBranch(): unknown[] } }): GoalQueueRuntimeState {
	let queue: QueuedGoal[] = [];
	for (const entry of ctx.sessionManager.getBranch()) {
		const event = entryToQueueEvent(entry);
		if (!event) continue;
		queue = applyQueueEvent(queue, event);
	}
	runtimeQueue = queue;
	return { queue };
}

export function setQueueForTests(state: GoalQueueRuntimeState): void {
	runtimeQueue = state.queue;
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

function entryToQueueEvent(entry: unknown): GoalQueueEvent | null {
	const raw = toQueueEventRecord(entry);
	if (!raw) return null;
	if (raw.kind === "enqueue") return parseEnqueueEvent(raw);
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

function parseEnqueueEvent(raw: QueueEventRecord): GoalQueueEvent | null {
	const goal = toQueuedGoal(raw.goal);
	if (!goal) return null;
	const queueId = toOptionalString(raw.queueId) ?? goal.queueId;
	return {
		version: 1,
		kind: "enqueue",
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
	const templateFlags = parseOptionalStringRecordField(raw.templateFlags);
	if (!templateFlags.ok) return null;
	const template = parseOptionalStringField(raw.template);
	if (!template.ok) return null;
	const templateArgs = parseOptionalStringField(raw.templateArgs);
	if (!templateArgs.ok) return null;

	return {
		queueId,
		objective,
		tokenBudget: tokenBudget.value,
		timeBudgetSeconds: timeBudgetSeconds.value,
		source,
		template: template.value,
		templateFlags: templateFlags.value,
		templateArgs: templateArgs.value,
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
	if (event.kind === "dequeue") {
		dequeueByEvent(next, event.queueId);
		return next;
	}
	if (event.kind === "remove") removeByQueueId(next, event.queueId);
	return next;
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
