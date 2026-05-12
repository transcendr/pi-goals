import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { getQueue } from "./queue-state";
import { getGoal, getTelemetry } from "./state";

const DEFAULT_LOG_PATH = "/tmp/pi-goals-compaction-debug.log";
const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);

export type DebugFields = Record<string, string | number | boolean | null | undefined>;

export function logCompactionDebug(event: string, fields: DebugFields = {}): void {
	if (!isCompactionDebugEnabled()) return;
	const path = process.env.PI_GOAL_COMPACTION_DEBUG_LOG || DEFAULT_LOG_PATH;
	try {
		mkdirSync(dirname(path), { recursive: true });
		appendFileSync(path, `${JSON.stringify({ ts: new Date().toISOString(), event, ...snapshotState(), ...fields })}\n`, "utf8");
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.warn(`[pi-goal] failed to write compaction debug log: ${message}`);
	}
}

export function logCompactionDebugWithContext(event: string, ctx: ExtensionContext, fields: DebugFields = {}): void {
	if (!isCompactionDebugEnabled()) return;
	logCompactionDebug(event, { ...snapshotContext(ctx), ...fields });
}

function isCompactionDebugEnabled(): boolean {
	if (process.env.PI_GOAL_COMPACTION_DEBUG_LOG) return true;
	const enabled = process.env.PI_GOAL_COMPACTION_DEBUG;
	return typeof enabled === "string" && ENABLED_VALUES.has(enabled.toLowerCase());
}

function snapshotState(): DebugFields {
	const goal = getGoal();
	const queue = getQueue();
	const telemetry = getTelemetry();
	return {
		goalId: goal?.goalId,
		goalStatus: goal?.status,
		queueLength: queue.length,
		queueHeadId: queue[0]?.queueId,
		queueHeadTemplate: queue[0]?.template,
		lastContinuationReason: telemetry?.lastContinuationReason,
		lastCompactionContinuationAction: telemetry?.lastCompactionContinuationAction,
		lastCompactionContinuationKey: telemetry?.lastCompactionContinuationKey,
		lastCompactionContinuationAttempts: telemetry?.lastCompactionContinuationAttempts,
		lastCompactionContinuationFinalReason: telemetry?.lastCompactionContinuationFinalReason,
	};
}

function snapshotContext(ctx: ExtensionContext): DebugFields {
	return {
		ctxIsIdle: readContextBoolean(() => ctx.isIdle()),
		ctxHasPendingMessages: readContextBoolean(() => ctx.hasPendingMessages()),
	};
}

function readContextBoolean(read: () => boolean): boolean | undefined {
	try {
		return read();
	} catch {
		return undefined;
	}
}
