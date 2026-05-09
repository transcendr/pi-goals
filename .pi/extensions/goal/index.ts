import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerGoalCommand } from "./command";
import { cancelGoalContinuation, interruptActiveGoalTurn, scheduleBudgetLimitWrapUp, scheduleMaybeContinueGoal } from "./continuation";
import { registerGoalLifecycle } from "./lifecycle";
import { cancelGoalMonitor, scheduleGoalMonitor } from "./monitor";
import { registerGoalTools } from "./tools";
import { getQueue } from "./queue-state";

export default function goalExtension(pi: ExtensionAPI): void {
	registerGoalCommand(
		pi,
		(ctx, reason) => scheduleMaybeContinueGoal(pi, ctx, reason),
		cancelGoalContinuation,
		(ctx, goal) => interruptActiveGoalTurn(pi, ctx, goal),
		(ctx) => scheduleGoalMonitor(pi, ctx),
		cancelGoalMonitor,
	);
	registerGoalTools(pi, (ctx, reason) => scheduleMaybeContinueGoal(pi, ctx, reason), cancelGoalContinuation, (ctx) => scheduleGoalMonitor(pi, ctx), cancelGoalMonitor, (ctx, goal) => scheduleBudgetLimitWrapUp(pi, ctx, goal), () => getQueue().length);
	registerGoalLifecycle(pi);
}
