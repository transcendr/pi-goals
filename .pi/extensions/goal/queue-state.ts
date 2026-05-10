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
	if (typeof entry !== "object" || entry === null) return null;
	const candidate = entry as Record<string, unknown>;
	if (candidate.type !== "custom" || candidate.customType !== STATE_ENTRY_TYPE) return null;
	const data = candidate.data;
	if (typeof data !== "object" || data === null) return null;
	const d = data as Record<string, unknown>;
	if (d.version !== 1) return null;
	if (!["enqueue", "dequeue", "remove"].includes(String(d.kind))) return null;
	return d as GoalQueueEvent;
}

function applyQueueEvent(queue: QueuedGoal[], event: GoalQueueEvent): QueuedGoal[] {
	const q = [...queue];
	switch (event.kind) {
		case "enqueue":
			if (event.goal) q.push(event.goal);
			break;
		case "dequeue":
			q.shift();
			break;
		case "remove":
			if (event.queueId) {
				const idx = q.findIndex((g) => g.queueId === event.queueId);
				if (idx !== -1) q.splice(idx, 1);
			}
			break;
	}
	return q;
}