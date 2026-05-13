import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerGoalCommand } from "./command";
import { cancelGoalContinuation, interruptActiveGoalTurn, scheduleBudgetLimitWrapUp, scheduleMaybeContinueGoal } from "./continuation";
import { registerGoalLifecycle } from "./lifecycle";
import { cancelGoalMonitor, scheduleGoalMonitor } from "./monitor";
import { registerGoalTools } from "./tools";
import { getQueue } from "./queue-state";
import { sendQueueHandoff, sendQueueSteering } from "./queue-steering";

export default function goalExtension(pi: ExtensionAPI): void {
	registerGoalCommand(
		pi,
		(ctx, reason) => scheduleMaybeContinueGoal(pi, ctx, reason),
		cancelGoalContinuation,
		(ctx, goal) => interruptActiveGoalTurn(pi, ctx, goal),
		(ctx) => scheduleGoalMonitor(pi, ctx),
		cancelGoalMonitor,
		(reason, opts) => sendQueueSteering(pi, reason, opts),
	);
	registerGoalTools(pi, {
		scheduleContinuation: (ctx, reason) => scheduleMaybeContinueGoal(pi, ctx, reason),
		cancelContinuation: cancelGoalContinuation,
		scheduleMonitor: (ctx) => scheduleGoalMonitor(pi, ctx),
		cancelMonitor: cancelGoalMonitor,
		scheduleBudgetLimitWrapUp: (ctx, goal) => scheduleBudgetLimitWrapUp(pi, ctx, goal),
		getQueueSize: () => getQueue().length,
		sendQueueSteering: (reason, opts) => sendQueueSteering(pi, reason, opts),
		sendQueueHandoff: (reason, opts) => sendQueueHandoff(pi, reason, opts),
	});
	registerGoalLifecycle(pi);
}
