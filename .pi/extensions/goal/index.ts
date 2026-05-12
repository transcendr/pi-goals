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
	registerGoalTools(pi, (ctx, reason) => scheduleMaybeContinueGoal(pi, ctx, reason), cancelGoalContinuation, (ctx) => scheduleGoalMonitor(pi, ctx), cancelGoalMonitor, (ctx, goal) => scheduleBudgetLimitWrapUp(pi, ctx, goal), () => getQueue().length, (reason, opts) => sendQueueHandoff(pi, reason, opts));
	registerGoalLifecycle(pi);
}
