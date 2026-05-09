import { GOAL_MONITOR_PROMPT_ID } from "./constants";
import { escapeXml } from "./format";
import type { GoalMonitorLogEntry, GoalMonitorRecentEntry, GoalMonitorReport } from "./types";

export function buildGoalMonitorPrompt(report: GoalMonitorReport): string {
	return `You are the persistent third-party churn monitor for one active pi-goal.

You are not the worker. Do not solve the task. Do not mark the goal complete.
Your job is to judge whether the worker is visibly stuck in unproductive churn and, only when justified, provide one narrow steering instruction.

You are project-, goal-, and process-agnostic. Apply general reasoning.

Do not be impatient. A hard task, long runtime, one failed attempt, repeated validation, or sparse report cadence is not automatically churn.
Use timestamps, elapsed time, prior churn-log entries, and recent worker behavior to decide whether there is real identifiable churn.
You receive only bounded recent churn-log entries. Reason from that bounded history and do not assume omitted entries are evidence.

Look for patterns such as:
- strategy_fixation
- irrelevant_artifact_fixation
- unsupported_assumption_loop
- complexity_escalation
- evidence_blind_retry
- validation_tunnel_vision
- scope_drift
- thrash
- user_escalation_needed

Task-specific details belong in evidence, not in pattern names.

If steering is warranted:
- identify the bad pattern
- state what to stop doing
- tell the worker to step back to first principles
- suggest the single simplest concrete next action likely to unblock progress
- keep it concise
- do not take over the task
- do not ask for broad rewrites

If steering is not warranted, return action watch and explain briefly in <log_note> why you are waiting.
If user input, a user decision, missing credentials, or another external dependency is required, return action escalate.

Return XML only, using this schema:

<churn_monitor_decision>
  <action>watch|steer|escalate</action>
  <confidence>low|medium|high</confidence>
  <pattern>optional_stable_pattern_name</pattern>
  <evidence>Optional evidence item.</evidence>
  <steer>Required only when action is steer.</steer>
  <log_note>Timestamp-aware reason for waiting, steering, or escalating.</log_note>
</churn_monitor_decision>

<prompt_id>${GOAL_MONITOR_PROMPT_ID}</prompt_id>

${renderReport(report)}`;
}

export function buildGoalMonitorSteerPrompt(report: GoalMonitorReport, steer: string): string {
	return `Third-party pi-goal churn monitor steering for the active goal.

Before following this steering, verify with get_goal if needed. If get_goal reports this goal is paused, absent, complete, budget-limited, or has a different goal id, treat this monitor steering as stale and ignore it.

<goal_id>${escapeXml(report.goalId)}</goal_id>
<report_id>${escapeXml(report.reportId)}</report_id>
<monitor_steer>
${escapeXml(steer)}
</monitor_steer>`;
}

function renderReport(report: GoalMonitorReport): string {
	return `<latest_sparse_report>
  <schema_version>${report.version}</schema_version>
  <report_id>${escapeXml(report.reportId)}</report_id>
  <goal_id>${escapeXml(report.goalId)}</goal_id>
  <sent_at>${report.sentAt}</sent_at>
  <elapsed_since_goal_start_seconds>${report.elapsedSinceGoalStartSeconds}</elapsed_since_goal_start_seconds>
  ${optionalNumberTag("elapsed_since_previous_report_seconds", report.elapsedSincePreviousReportSeconds)}
  <session>
    <cwd>${escapeXml(report.session.cwd)}</cwd>
    <session_id>${escapeXml(report.session.sessionId ?? "unknown")}</session_id>
    <branch_entry_count>${report.session.branchEntryCount}</branch_entry_count>
  </session>
  ${renderGoal(report)}
  ${renderTelemetry(report)}
  <recent_worker_context>
${report.recentEntries.map(renderRecentEntry).join("\n")}
  </recent_worker_context>
  <recent_churn_log limit="${report.recentLogEntries.length}">
${report.recentLogEntries.map(renderLogEntry).join("\n")}
  </recent_churn_log>
</latest_sparse_report>`;
}

function renderGoal(report: GoalMonitorReport): string {
	const goal = report.goal;
	return `<goal>
    <objective>${escapeXml(goal.objective)}</objective>
    <status>${goal.status}</status>
    <token_budget>${goal.tokenBudget ?? "none"}</token_budget>
    <time_budget_seconds>${goal.timeBudgetSeconds ?? "none"}</time_budget_seconds>
    <tokens_used>${goal.tokensUsed}</tokens_used>
    <time_used_seconds>${goal.timeUsedSeconds}</time_used_seconds>
    <created_at>${goal.createdAt}</created_at>
    <updated_at>${goal.updatedAt}</updated_at>
  </goal>`;
}

function renderTelemetry(report: GoalMonitorReport): string {
	const telemetry = report.telemetry;
	if (!telemetry) return "<telemetry>none</telemetry>";
	return `<telemetry>
    <total_turns>${telemetry.totalTurns}</total_turns>
    <user_turns>${telemetry.userTurns}</user_turns>
    <auto_turns>${telemetry.autoTurns}</auto_turns>
    <consecutive_auto_turns>${telemetry.consecutiveAutoTurns}</consecutive_auto_turns>
    <consecutive_no_progress_turns>${telemetry.consecutiveNoProgressTurns}</consecutive_no_progress_turns>
    <last_turn_origin>${escapeXml(telemetry.lastTurnOrigin ?? "unknown")}</last_turn_origin>
    <last_continuation_reason>${escapeXml(telemetry.lastContinuationReason ?? "unknown")}</last_continuation_reason>
    <last_skip_reason>${escapeXml(telemetry.lastSkipReason ?? "none")}</last_skip_reason>
    <last_turn_tool_call_count>${telemetry.lastTurnToolCallCount ?? 0}</last_turn_tool_call_count>
    <last_turn_tool_result_count>${telemetry.lastTurnToolResultCount ?? 0}</last_turn_tool_result_count>
    <last_turn_completed_goal>${telemetry.lastTurnCompletedGoal ?? false}</last_turn_completed_goal>
    <budget_wrap_up_sent>${telemetry.budgetWrapUpSent ?? false}</budget_wrap_up_sent>
    <last_progress_at>${telemetry.lastProgressAt ?? "unknown"}</last_progress_at>
    <last_safety_pause_reason>${escapeXml(telemetry.lastSafetyPauseReason ?? "none")}</last_safety_pause_reason>
    <last_budget_limit_reason>${escapeXml(telemetry.lastBudgetLimitReason ?? "none")}</last_budget_limit_reason>
    <last_budget_warning_reason>${escapeXml(telemetry.lastBudgetWarningReason ?? "none")}</last_budget_warning_reason>
    <last_budget_hard_stop_reason>${escapeXml(telemetry.lastBudgetHardStopReason ?? "none")}</last_budget_hard_stop_reason>
    <token_budget_warning_sent>${telemetry.tokenBudgetWarningSent ?? false}</token_budget_warning_sent>
    <time_budget_warning_sent>${telemetry.timeBudgetWarningSent ?? false}</time_budget_warning_sent>
    <updated_at>${telemetry.updatedAt}</updated_at>
  </telemetry>`;
}

function renderRecentEntry(entry: GoalMonitorRecentEntry): string {
	return `    <entry index="${entry.index}">
      <type>${escapeXml(entry.type)}</type>
      <role>${escapeXml(entry.role ?? "unknown")}</role>
      <timestamp>${escapeXml(String(entry.timestamp ?? "unknown"))}</timestamp>
      <tool_name>${escapeXml(entry.toolName ?? "none")}</tool_name>
      <is_error>${entry.isError ?? false}</is_error>
      <summary>${escapeXml(entry.summary)}</summary>
    </entry>`;
}

function renderLogEntry(entry: GoalMonitorLogEntry): string {
	return `    <log_entry>
      <at>${entry.at}</at>
      <report_id>${escapeXml(entry.reportId)}</report_id>
      <action>${entry.action}</action>
      <confidence>${entry.confidence}</confidence>
      <pattern>${escapeXml(entry.pattern ?? "none")}</pattern>
      <evidence_summary>${escapeXml(entry.evidenceSummary)}</evidence_summary>
      <steer_injected>${entry.steerInjected}</steer_injected>
      <log_note>${escapeXml(entry.logNote)}</log_note>
    </log_entry>`;
}

function optionalNumberTag(tag: string, value?: number): string {
	return value === undefined ? "" : `<${tag}>${value}</${tag}>`;
}
