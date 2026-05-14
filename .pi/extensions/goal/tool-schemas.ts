import { Type } from "typebox";

export const EmptyParams = Type.Object({});
export const PostCompletionContextParam = Type.Union([Type.Literal("none"), Type.Literal("clear"), Type.Literal("summarize")]);
export const PostCompletionActionParam = Type.Object({ type: Type.Literal("context.reset"), mode: Type.Union([Type.Literal("clear"), Type.Literal("summarize")]) });
export const TemplateFlags = Type.Record(Type.String(), Type.String());
export const NullableNumber = Type.Union([Type.Number(), Type.Null()]);
export const CreateGoalParams = Type.Object({
	objective: Type.String({ description: "Goal objective explicitly requested by the user" }),
	token_budget: Type.Optional(Type.Number({ description: "Optional positive token budget" })),
	time_budget_seconds: Type.Optional(Type.Number({ description: "Optional positive time budget in seconds" })),
	min_tokens_before_wrap_up: Type.Optional(Type.Number({ description: "Optional positive minimum tokens before normal wrap-up/completion is allowed" })),
	min_time_seconds_before_wrap_up: Type.Optional(Type.Number({ description: "Optional positive minimum time seconds before normal wrap-up/completion is allowed" })),
	post_completion_context: Type.Optional(PostCompletionContextParam),
	post_completion_actions: Type.Optional(Type.Array(PostCompletionActionParam)),
});
export const CreateGoalFromTemplateParams = Type.Object({
	template: Type.String({ description: "Reusable goal template name or alias explicitly requested by the user" }),
	flags: Type.Optional(TemplateFlags),
	args: Type.Optional(Type.String({ description: "Template invocation arguments parsed like `/goal <template> ...`: use `--flag value` and `-- trailing args`." })),
	token_budget: Type.Optional(Type.Number({ description: "Optional positive token budget" })),
	time_budget_seconds: Type.Optional(Type.Number({ description: "Optional positive time budget in seconds" })),
	min_tokens_before_wrap_up: Type.Optional(Type.Number({ description: "Optional positive minimum tokens before normal wrap-up/completion is allowed" })),
	min_time_seconds_before_wrap_up: Type.Optional(Type.Number({ description: "Optional positive minimum time seconds before normal wrap-up/completion is allowed" })),
	post_completion_context: Type.Optional(PostCompletionContextParam),
	post_completion_actions: Type.Optional(Type.Array(PostCompletionActionParam)),
});
export const UpdateGoalParams = Type.Object({
	status: Type.Optional(Type.String({ description: "Optional status update: active, paused, or complete" })),
	objective: Type.Optional(Type.String({ description: "Optional replacement objective explicitly requested by the user" })),
	token_budget: Type.Optional(NullableNumber),
	time_budget_seconds: Type.Optional(NullableNumber),
	min_tokens_before_wrap_up: Type.Optional(NullableNumber),
	min_time_seconds_before_wrap_up: Type.Optional(NullableNumber),
});
