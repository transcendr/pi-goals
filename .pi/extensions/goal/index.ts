import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerGoalCommand } from "./command";
import { cancelGoalContinuation, scheduleMaybeContinueGoal } from "./continuation";
import { registerGoalLifecycle } from "./lifecycle";
import { registerGoalTools } from "./tools";

export default function goalExtension(pi: ExtensionAPI): void {
	registerGoalCommand(pi, (ctx, reason) => scheduleMaybeContinueGoal(pi, ctx, reason), cancelGoalContinuation);
	registerGoalTools(pi);
	registerGoalLifecycle(pi);
}
