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

Check the goal objective for any user-provided custom or special churn-monitor instructions. Treat those objective-embedded monitor instructions as goal-specific guidance for your judgment standard and steering posture, while still requiring real identifiable churn before correction. For example, if the objective says to react aggressively when the worker gets stuck on old irrelevant repo helpers, incorporate that instruction when evaluating helper-fixation evidence.

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

Floor-specific stable pattern names when completion floors are unmet:
- floor_ignored_early_wrapup
- quota_filling_churn
- repeated_floor_pass_no_new_evidence
- productive_floor_deepening
- floor_blocked_autonomous_fallback_needed
- floor_quality_exhausted

When completion floors are unmet, floors are a quality backstop, not a quota target:
- return watch when the worker is doing a concrete catalog value pass and recent context shows new evidence, changed artifacts, proof output, compatibility findings, or a precise inspected no-gap finding;
- return steer when the worker retries early wrap-up, repeats summaries, avoids tools/evidence, burns time/tokens without objective-linked improvement, repeats the same floor pass without new evidence, or asks the user for floor-unmet direction without explicit objective permission;
- monitor steering must name one next value pass and one concrete next action, for example: "Switch to validation_expansion: add or run one probe that would fail if the current artifact missed the main invariant.";
- do not return escalate merely because floors are unmet or no obvious next pass appears;
- use escalate only when the objective explicitly allows user input or a separate safety/authorization blocker requires it;
- after repeated bad/no-evidence floor work, use floor_quality_exhausted so the completion gate can allow completion with a recorded no_more_valuable_work_reason rather than trapping the worker in churn.

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
  ${renderFloor(report)}
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

function renderFloor(report: GoalMonitorReport): string {
	const floor = report.floor;
	return `<floor>
    <min_tokens_before_wrap_up>${floor.minTokensBeforeWrapUp ?? "none"}</min_tokens_before_wrap_up>
    <min_time_seconds_before_wrap_up>${floor.minTimeSecondsBeforeWrapUp ?? "none"}</min_time_seconds_before_wrap_up>
    <tokens_remaining_before_wrap_up>${floor.tokensRemainingBeforeWrapUp ?? "none"}</tokens_remaining_before_wrap_up>
    <time_seconds_remaining_before_wrap_up>${floor.timeSecondsRemainingBeforeWrapUp ?? "none"}</time_seconds_remaining_before_wrap_up>
    <token_floor_met>${floor.tokenFloorMet}</token_floor_met>
    <time_floor_met>${floor.timeFloorMet}</time_floor_met>
    <all_floors_met>${floor.allFloorsMet}</all_floors_met>
    <completion_blocked_by_floor>${floor.completionBlockedByFloor}</completion_blocked_by_floor>
    <last_floor_card_id>${escapeXml(floor.lastFloorCardId ?? "none")}</last_floor_card_id>
    <completed_floor_card_ids>${escapeXml(floor.completedFloorCardIds.join(",") || "none")}</completed_floor_card_ids>
    <floor_steer_count>${floor.floorSteerCount}</floor_steer_count>
    <floor_churn_steer_count>${floor.floorChurnSteerCount}</floor_churn_steer_count>
    <floor_quality_state>${floor.floorQualityState}</floor_quality_state>
  </floor>`;
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
    <last_floor_card_id>${escapeXml(telemetry.lastFloorCardId ?? "none")}</last_floor_card_id>
    <completed_floor_card_ids>${escapeXml((telemetry.completedFloorCardIds ?? []).join(",") || "none")}</completed_floor_card_ids>
    <floor_steer_count>${telemetry.floorSteerCount ?? 0}</floor_steer_count>
    <floor_churn_steer_count>${telemetry.floorChurnSteerCount ?? 0}</floor_churn_steer_count>
    <floor_quality_state>${escapeXml(telemetry.floorQualityState ?? "inactive")}</floor_quality_state>
    <no_more_valuable_work_reason>${escapeXml(telemetry.noMoreValuableWorkReason ?? "none")}</no_more_valuable_work_reason>
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
