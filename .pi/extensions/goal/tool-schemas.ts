import { Type } from "typebox";

export const EmptyParams = Type.Object({});
export const PostCompletionContextParam = Type.Union([Type.Literal("none"), Type.Literal("clear"), Type.Literal("summarize")]);
export const PostCompletionActionParam = Type.Object({ type: Type.Literal("context.reset"), mode: Type.Union([Type.Literal("clear"), Type.Literal("summarize")]) });
export const TemplateFlags = Type.Record(Type.String(), Type.String());
export const NullableNumber = Type.Union([Type.Number(), Type.Null()]);
