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

export type GoalQueueEvent = {
	version: 1;
	kind: "enqueue" | "dequeue" | "remove" | "clear";
	queueId?: string;
	goal?: QueuedGoal | null;
	reason: string;
	at: number;
};

export type GoalQueueRuntimeState = {
	queue: QueuedGoal[];
};