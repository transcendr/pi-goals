import type { CompletionFloorEvaluation } from "./floor";
import { formatElapsed, formatTokensCompact } from "./format";
import type { FloorValuePassId, GoalState, GoalTelemetrySnapshot } from "./types";

export type { FloorValuePassId };

export type FloorWorkCard = {
	id: FloorValuePassId;
	label: string;
	chooseWhen: string;
	concreteFirstAction: string;
	requiredEvidence: string[];
	avoid: string[];
};

export type FloorWorkSelectionContext = {
	goal: GoalState;
	telemetry: GoalTelemetrySnapshot | null;
	floor: CompletionFloorEvaluation;
	recentMonitorPatterns?: string[];
};

export const FLOOR_VALUE_PASS_CATALOG: readonly FloorWorkCard[] = [
	{
		id: "requirement_gap_audit",
		label: "Requirement gap audit",
		chooseWhen: "Explicit requirements may not all be mapped to evidence.",
		concreteFirstAction: "Re-read the objective and map each explicit requirement to a concrete artifact, command, file, or proof.",
		requiredEvidence: ["requirement-to-evidence delta", "fixed gap or precise no-gap finding"],
		avoid: ["restating the checklist without inspecting evidence"],
	},
	{
		id: "adversarial_review",
		label: "Adversarial review",
		chooseWhen: "Existing solution may false-green or miss edge cases.",
		concreteFirstAction: "Attack assumptions, enumerate failure modes, and add or tighten a mitigation, test, or proof row.",
		requiredEvidence: ["new risk, test, validation row, or mitigation"],
		avoid: ["generic looks-good review"],
	},
	{
		id: "alternate_perspective",
		label: "Alternate perspective review",
		chooseWhen: "Design, product, API, operator, or runtime tradeoffs may be under-examined.",
		concreteFirstAction: "Review the work from one concrete alternate perspective and reconcile the consequence into the artifact or design.",
		requiredEvidence: ["design adjustment, rejected alternative, or documented invariant"],
		avoid: ["brainstorming with no decision or writeback"],
	},
	{
		id: "research_expansion",
		label: "Research expansion",
		chooseWhen: "More local, external, docs, code, web, GitHub, or open-source evidence can improve quality.",
		concreteFirstAction: "Inspect one relevant source and write back the finding only if it changes the design, proof, or artifact.",
		requiredEvidence: ["cited finding with concrete impact"],
		avoid: ["unrelated browsing or source dumping"],
	},
	{
		id: "validation_expansion",
		label: "Validation expansion",
		chooseWhen: "Proof coverage is thin or completion depends on unverified behavior.",
		concreteFirstAction: "Run or add one targeted probe that would fail if the main invariant is wrong.",
		requiredEvidence: ["command/probe output", "why the probe covers the invariant"],
		avoid: ["rerunning unrelated green checks only"],
	},
	{
		id: "simplification_deslop",
		label: "Simplification/deslop",
		chooseWhen: "Artifact, code, or design looks overcomplex, duplicated, or AI-sloppy.",
		concreteFirstAction: "Remove duplication, simplify an API/flow, or tighten wording while preserving behavior.",
		requiredEvidence: ["concrete diff or simplified section"],
		avoid: ["style-only churn"],
	},
	{
		id: "compatibility_review",
		label: "Compatibility review",
		chooseWhen: "Change may affect replay, queue, budgets, UI, safety, security, performance, or accessibility.",
		concreteFirstAction: "Inspect one cross-surface compatibility point and add a guardrail, invariant, or acceptance criterion.",
		requiredEvidence: ["compatibility finding, invariant, or acceptance criterion"],
		avoid: ["speculative concern with no action"],
	},
	{
		id: "docs_handoff_evidence",
		label: "Docs/handoff evidence",
		chooseWhen: "Work is technically done but hard to verify or continue.",
		concreteFirstAction: "Improve README, issue, comments, closeout, proof links, or handoff evidence with one concrete missing detail.",
		requiredEvidence: ["clearer handoff/evidence artifact"],
		avoid: ["summary-only final answer"],
	},
];

export function selectFloorWorkCard(context: FloorWorkSelectionContext): FloorWorkCard | undefined {
	const completed = new Set(context.telemetry?.completedFloorCardIds ?? []);
	const last = context.telemetry?.lastFloorCardId;
	const candidates = FLOOR_VALUE_PASS_CATALOG.filter((card) => card.id !== last).filter((card) => !completed.has(card.id));
	return preferByObjective(candidates, context.goal.objective) ?? candidates.find((card) => card.id === "requirement_gap_audit") ?? candidates[0];
}

export function buildFloorContinuationGuidance(context: { goal: GoalState; telemetry: GoalTelemetrySnapshot | null; floor: CompletionFloorEvaluation; card: FloorWorkCard }): string {
	return `${formatFloorBlock(context.floor)}

Completion floor guidance: choose exactly one next_floor_pass before doing more work.
next_floor_pass: ${context.card.id} (${context.card.label})
Concrete next action: ${context.card.concreteFirstAction}
Required evidence before another completion attempt:
${context.card.requiredEvidence.map((item) => `- ${item}`).join("\n")}
Avoid:
${context.card.avoid.map((item) => `- ${item}`).join("\n")}

Autonomous fallback ladder when no obvious high-value pass is available: requirement/gap audit → validation/proof expansion → alternate-perspective or adversarial review → deeper local/external research → simplification/deslop/maintainability pass → documentation, handoff, and evidence hardening.

Use at least one concrete tool-backed inspection, edit, or proof when tools are available, and produce a tangible new evidence/artifact delta before another completion attempt. Do not ask the user what else to do merely because the floor is unmet. If no safe autonomous card can produce objective-linked evidence, record noMoreValuableWorkReason: "no_safe_autonomous_work" instead of manufacturing busywork.`;
}

export function buildFloorCompletionRefusal(context: { goal: GoalState; floor: CompletionFloorEvaluation; card: FloorWorkCard }): string {
	return `Completion deferred by goal floor. The goal remains active.

${formatFloorBlock(context.floor)}

Next value pass: ${context.card.id} (${context.card.label})
Concrete next action: ${context.card.concreteFirstAction}

Before trying update_goal(status:"complete") again, produce a tangible new evidence/artifact delta with objective-linked evidence:
${context.card.requiredEvidence.map((item) => `- ${item}`).join("\n")}

Autonomous fallback ladder if this pass is not viable: requirement/gap audit → validation/proof expansion → alternate-perspective or adversarial review → deeper local/external research → simplification/deslop/maintainability pass → documentation, handoff, and evidence hardening.

Do not ask the user what else to do unless the original objective explicitly required a user decision or a separate safety/destructive-action boundary blocks autonomous work. Do not fill quota with repeated summaries or unrelated churn.`;
}

export function objectiveAllowsUserFloorFallback(objective: string): boolean {
	return [/\bask me\b/i, /\bconfirm with me\b/i, /\bwait for my decision\b/i, /\blet me choose\b/i, /\bbefore choosing\b/i].some((pattern) => pattern.test(objective));
}

export function formatFloorBlock(floor: CompletionFloorEvaluation): string {
	const lines = ["Unmet completion floor(s):"];
	if (floor.minTokensBeforeWrapUp !== undefined) {
		lines.push(`- tokens before wrap-up: ${formatTokensCompact(floor.minTokensBeforeWrapUp - (floor.tokensRemainingBeforeWrapUp ?? 0))} / ${formatTokensCompact(floor.minTokensBeforeWrapUp)}${floor.tokenFloorMet ? " (met)" : ""}`);
	}
	if (floor.minTimeSecondsBeforeWrapUp !== undefined) {
		lines.push(`- time before wrap-up: ${formatElapsed(floor.minTimeSecondsBeforeWrapUp - (floor.timeSecondsRemainingBeforeWrapUp ?? 0))} / ${formatElapsed(floor.minTimeSecondsBeforeWrapUp)}${floor.timeFloorMet ? " (met)" : ""}`);
	}
	return lines.join("\n");
}

function preferByObjective(candidates: FloorWorkCard[], objective: string): FloorWorkCard | undefined {
	const lower = objective.toLowerCase();
	const ordered: FloorValuePassId[] = [];
	if (/test|probe|validate|proof|live/.test(lower)) ordered.push("validation_expansion");
	if (/research|web|github|docs|source/.test(lower)) ordered.push("research_expansion");
	if (/review|risk|threat|edge/.test(lower)) ordered.push("adversarial_review");
	if (/compat|replay|queue|budget|ui|security|performance|accessibility/.test(lower)) ordered.push("compatibility_review");
	if (/simpl|deslop|maintain/.test(lower)) ordered.push("simplification_deslop");
	if (/readme|doc|handoff|closeout/.test(lower)) ordered.push("docs_handoff_evidence");
	for (const id of ordered) {
		const match = candidates.find((card) => card.id === id);
		if (match) return match;
	}
	return undefined;
}
