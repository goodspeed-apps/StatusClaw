/**
 * Escalation Engine
 * Evaluates incidents against escalation rules and triggers actions
 */

import type { Incident, IncidentStatus } from './mock-data'
import { escalationRuleStore, type EscalationRule, type TriggerKind } from './escalation-rule-store'
import { severityLevelStore } from './severity-level-store'
import { getIncidentStore } from './incident-store'

export interface EscalationResult {
  ruleId: string
  ruleName: string
  incidentId: string
  incidentTitle: string
  triggered: boolean
  fireId?: string
  error?: string
}

export interface EvaluationContext {
  now: Date
  incident: Incident
  severityId: string
  elapsedMinutes: number
  timeInStatusMinutes: Record<IncidentStatus, number>
}

/**
 * Calculate time in each status for an incident
 */
function calculateTimeInStatuses(incident: Incident): Record<IncidentStatus, number> {
  const result: Record<IncidentStatus, number> = {
    investigating: 0,
    identified: 0,
    monitoring: 0,
    resolved: 0,
  }

  if (!incident.updates || incident.updates.length === 0) {
    // No updates - all time in current status
    const started = new Date(incident.startedAt).getTime()
    const now = Date.now()
    result[incident.status] = Math.floor((now - started) / 60000)
    return result
  }

  // Sort updates chronologically
  const sortedUpdates = [...incident.updates].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  // Track status transitions
  let currentStatus = sortedUpdates[0]?.status || incident.status
  let statusStartTime = new Date(incident.startedAt).getTime()

  for (let i = 1; i < sortedUpdates.length; i++) {
    const update = sortedUpdates[i]
    if (update.status !== currentStatus) {
      // Status changed - add time to previous status
      const updateTime = new Date(update.createdAt).getTime()
      result[currentStatus] += Math.floor((updateTime - statusStartTime) / 60000)
      currentStatus = update.status
      statusStartTime = updateTime
    }
  }

  // Add time for current status
  const now = Date.now()
  result[currentStatus] += Math.floor((now - statusStartTime) / 60000)

  return result
}

/**
 * Check if a rule should trigger for an incident
 */
function shouldTrigger(rule: EscalationRule, context: EvaluationContext): boolean {
  // Check if rule applies to this severity
  if (rule.severityIds.length > 0 && !rule.severityIds.includes(context.severityId)) {
    return false
  }

  // Check if incident is in an applicable status
  if (!rule.statusIn.includes(context.incident.status)) {
    return false
  }

  // Check time-based trigger
  if (rule.trigger.kind === 'time_since_started') {
    return context.elapsedMinutes >= rule.trigger.minutes
  }

  if (rule.trigger.kind === 'time_in_status') {
    // Check time in current status
    const timeInCurrentStatus = context.timeInStatusMinutes[context.incident.status] || 0
    return timeInCurrentStatus >= rule.trigger.minutes
  }

  return false
}

/**
 * Evaluate a single incident against all applicable rules
 */
export function evaluateIncident(incident: Incident, now: Date = new Date()): EscalationResult[] {
  const results: EscalationResult[] = []
  
  // Skip resolved incidents
  if (incident.status === 'resolved') {
    return results
  }

  // Get severity ID from incident
  // First try to find by slug (for backward compatibility)
  let severityId: string = incident.severity
  const severityLevel = severityLevelStore.getBySlug(incident.severity)
  if (severityLevel) {
    severityId = severityLevel.id
  }

  // Calculate time metrics
  const startedAt = new Date(incident.startedAt).getTime()
  const elapsedMinutes = Math.floor((now.getTime() - startedAt) / 60000)
  const timeInStatusMinutes = calculateTimeInStatuses(incident)

  const context: EvaluationContext = {
    now,
    incident,
    severityId,
    elapsedMinutes,
    timeInStatusMinutes,
  }

  // Get applicable rules
  const rules = escalationRuleStore.getRulesForSeverity(severityId)

  for (const rule of rules) {
    // Check if this rule has already fired for this incident
    if (escalationRuleStore.hasFired(incident.id, rule.id)) {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        incidentId: incident.id,
        incidentTitle: incident.title,
        triggered: false,
      })
      continue
    }

    // Check if rule should trigger
    if (shouldTrigger(rule, context)) {
      try {
        // Record the fire for idempotency
        const fire = escalationRuleStore.recordFire(incident.id, rule.id)
        
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          incidentId: incident.id,
          incidentTitle: incident.title,
          triggered: true,
          fireId: fire.id,
        })
      } catch (error) {
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          incidentId: incident.id,
          incidentTitle: incident.title,
          triggered: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    } else {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        incidentId: incident.id,
        incidentTitle: incident.title,
        triggered: false,
      })
    }
  }

  return results
}

/**
 * Evaluate all ongoing incidents
 */
export function evaluateAllIncidents(now: Date = new Date()): EscalationResult[] {
  const incidentStore = getIncidentStore()
  const ongoingIncidents = incidentStore.getOngoingIncidents()
  
  const allResults: EscalationResult[] = []
  
  for (const incident of ongoingIncidents) {
    const results = evaluateIncident(incident, now)
    allResults.push(...results)
  }
  
  return allResults
}

/**
 * Get pending escalations (rules that would trigger but haven't fired yet)
 */
export function getPendingEscalations(incident: Incident, now: Date = new Date()): Array<{
  ruleId: string
  ruleName: string
  minutesRemaining: number
  triggerMinutes: number
}> {
  const pending: Array<{
    ruleId: string
    ruleName: string
    minutesRemaining: number
    triggerMinutes: number
  }> = []

  if (incident.status === 'resolved') {
    return pending
  }

  // Get severity ID
  let severityId: string = incident.severity
  const severityLevel = severityLevelStore.getBySlug(incident.severity)
  if (severityLevel) {
    severityId = severityLevel.id
  }

  // Calculate time metrics
  const startedAt = new Date(incident.startedAt).getTime()
  const elapsedMinutes = Math.floor((now.getTime() - startedAt) / 60000)
  const timeInStatusMinutes = calculateTimeInStatuses(incident)

  const rules = escalationRuleStore.getRulesForSeverity(severityId)

  for (const rule of rules) {
    // Skip if already fired
    if (escalationRuleStore.hasFired(incident.id, rule.id)) {
      continue
    }

    // Skip if rule doesn't apply to current status
    if (!rule.statusIn.includes(incident.status)) {
      continue
    }

    let minutesRemaining: number
    if (rule.trigger.kind === 'time_since_started') {
      minutesRemaining = rule.trigger.minutes - elapsedMinutes
    } else {
      minutesRemaining = rule.trigger.minutes - (timeInStatusMinutes[incident.status] || 0)
    }

    if (minutesRemaining > 0) {
      pending.push({
        ruleId: rule.id,
        ruleName: rule.name,
        minutesRemaining,
        triggerMinutes: rule.trigger.minutes,
      })
    }
  }

  return pending
}

/**
 * Format message template with incident data
 */
export function formatEscalationMessage(
  template: string,
  incident: Incident,
  elapsedMinutes: number
): string {
  return template
    .replace(/\{\{incident\.title\}\}/g, incident.title)
    .replace(/\{\{incident\.id\}\}/g, incident.id)
    .replace(/\{\{incident\.service\}\}/g, incident.service)
    .replace(/\{\{incident\.severity\}\}/g, incident.severity)
    .replace(/\{\{incident\.status\}\}/g, incident.status)
    .replace(/\{\{elapsedMinutes\}\}/g, elapsedMinutes.toString())
}
