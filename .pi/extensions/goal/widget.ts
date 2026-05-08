import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { commandHint, formatElapsed, formatTokensCompact, objectiveExcerpt } from "./format";
import type { GoalState, GoalStatus } from "./types";

type ThemeColor = "accent" | "success" | "warning" | "error" | "muted" | "dim" | "text" | "border" | "borderAccent";

type GoalWidgetTheme = {
	fg(color: ThemeColor, text: string): string;
	bold(text: string): string;
};

type GoalWidgetComponent = {
	render(width: number): string[];
	invalidate(): void;
};

type StatusStyle = {
	icon: string;
	label: string;
	color: ThemeColor;
};

type ResourceSpec = {
	icon: string;
	label: string;
	used: number;
	budget?: number;
	format(value: number): string;
	suffix?: string;
};

const BAR_WIDTH = 10;
const MIN_CARD_WIDTH = 28;
const MAX_CARD_WIDTH = 72;

export function goalWidgetFactory(goal: GoalState): (_tui: unknown, theme: GoalWidgetTheme) => GoalWidgetComponent {
	return (_tui, theme) => new GoalWidget(goal, theme);
}

export function renderGoalWidget(goal: GoalState, theme: GoalWidgetTheme, width: number): string[] {
	if (width < MIN_CARD_WIDTH) return compactLines(goal, theme, width);
	const cardWidth = Math.min(MAX_CARD_WIDTH, Math.max(MIN_CARD_WIDTH, width));
	const contentWidth = cardWidth - 4;
	const style = statusStyle(goal.status);
	const lines = [
		topBorder(cardWidth, style, theme),
		contentLine(theme.fg("dim", objectiveExcerpt(goal.objective, contentWidth)), contentWidth, theme),
		contentLine(resourceLine(timeResource(goal), theme), contentWidth, theme),
		contentLine(resourceLine(tokenResource(goal), theme), contentWidth, theme),
		contentLine(commandLine(goal.status, theme), contentWidth, theme),
		bottomBorder(cardWidth, theme),
	];
	return lines.map((line) => truncateToWidth(line, cardWidth));
}

class GoalWidget implements GoalWidgetComponent {
	constructor(private readonly goal: GoalState, private readonly theme: GoalWidgetTheme) {}

	render(width: number): string[] {
		return renderGoalWidget(this.goal, this.theme, width);
	}

	invalidate(): void {
		// Stateless render; no cache to clear.
	}
}

function compactLines(goal: GoalState, theme: GoalWidgetTheme, width: number): string[] {
	const style = statusStyle(goal.status);
	const status = theme.fg(style.color, `${style.icon} ${style.label}`);
	return [
		truncateToWidth(`${status} ${objectiveExcerpt(goal.objective, Math.max(6, width - 10))}`, width),
		truncateToWidth(`${timeValue(goal)}  ${tokenValue(goal)}`, width),
		truncateToWidth(commandHint(goal.status).replace(/^Commands: /, ""), width),
	];
}

function topBorder(width: number, style: StatusStyle, theme: GoalWidgetTheme): string {
	const title = theme.bold(theme.fg(style.color, `${style.icon} pi-goal`));
	const badge = theme.fg(style.color, style.label);
	const left = `╭─ ${title} `;
	const right = ` ${badge} ─╮`;
	const fill = "─".repeat(Math.max(1, width - visibleWidth(left) - visibleWidth(right)));
	return `${left}${theme.fg("border", fill)}${right}`;
}

function bottomBorder(width: number, theme: GoalWidgetTheme): string {
	return theme.fg("border", `╰${"─".repeat(Math.max(0, width - 2))}╯`);
}

function contentLine(content: string, width: number, theme: GoalWidgetTheme): string {
	const clipped = padAnsi(truncateToWidth(content, width, "…"), width);
	return `${theme.fg("border", "│")} ${clipped} ${theme.fg("border", "│")}`;
}

function commandLine(status: GoalStatus, theme: GoalWidgetTheme): string {
	const commands = commandHint(status).replace(/^Commands: /, "").split(", ");
	return `${theme.fg("muted", "next")} ${commands.map((cmd) => theme.fg("accent", cmd)).join("  ")}`;
}

function resourceLine(spec: ResourceSpec, theme: GoalWidgetTheme): string {
	if (spec.budget === undefined) return `${spec.icon} ${theme.fg("muted", spec.label)}  ${resourceValue(spec.used, spec.format, spec.suffix)}`;
	const percent = percentage(spec.used, spec.budget);
	return [
		`${spec.icon} ${theme.fg("muted", spec.label.padEnd(6))}`,
		progressBar(percent, theme),
		`${spec.format(spec.used)} / ${spec.format(spec.budget)}`,
		`${percent}%`,
	].join("  ");
}

function progressBar(percent: number, theme: GoalWidgetTheme): string {
	const filled = Math.round((clamp(percent, 0, 100) / 100) * BAR_WIDTH);
	return `${theme.fg("success", "█".repeat(filled))}${theme.fg("dim", "░".repeat(BAR_WIDTH - filled))}`;
}

function timeResource(goal: GoalState): ResourceSpec {
	return { icon: "⏱", label: "Time", used: goal.timeUsedSeconds, budget: goal.timeBudgetSeconds, format: formatElapsed };
}

function tokenResource(goal: GoalState): ResourceSpec {
	return { icon: "◈", label: "Tokens", used: goal.tokensUsed, budget: goal.tokenBudget, format: formatTokensCompact, suffix: "tokens" };
}

function timeValue(goal: GoalState): string {
	return goal.timeBudgetSeconds === undefined ? `⏱ ${formatElapsed(goal.timeUsedSeconds)}` : `⏱ ${formatElapsed(goal.timeUsedSeconds)} / ${formatElapsed(goal.timeBudgetSeconds)}`;
}

function tokenValue(goal: GoalState): string {
	return goal.tokenBudget === undefined ? `◈ ${formatTokensCompact(goal.tokensUsed)} tokens` : `◈ ${formatTokensCompact(goal.tokensUsed)} / ${formatTokensCompact(goal.tokenBudget)}`;
}

function resourceValue(value: number, format: (value: number) => string, suffix?: string): string {
	const formatted = format(value);
	return suffix ? `${formatted} ${suffix}` : formatted;
}

function percentage(used: number, budget: number): number {
	return clamp(Math.round((Math.max(0, used) / Math.max(1, budget)) * 100), 0, 100);
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function padAnsi(text: string, width: number): string {
	return `${text}${" ".repeat(Math.max(0, width - visibleWidth(text)))}`;
}

function statusStyle(status: GoalStatus): StatusStyle {
	switch (status) {
		case "active":
			return { icon: "🎯", label: "active", color: "accent" };
		case "paused":
			return { icon: "⏸", label: "paused", color: "warning" };
		case "budgetLimited":
			return { icon: "⚠", label: "budget limited", color: "warning" };
		case "complete":
			return { icon: "✓", label: "complete", color: "success" };
	}
}
