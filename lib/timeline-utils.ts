/**
 * Timeline helper functions
 * Handles time calculations and stage mapping for incident timeline
 */

import { formatDistance, formatDuration, intervalToDuration, differenceInMilliseconds } from 'date-fns'
import type { Incident, IncidentStatus, IncidentUpdate, TimelineStage, IncidentStatusChange } from '@/types/incident'

const STATUS_ORDER: IncidentStatus[] = ['investigating', 'identified', 'monitoring', 'resolved']

/**
 * Parse a date that may be string or Date
 */
export function parseDate(date: Date | string): Date {
  return date instanceof Date ? date : new Date(date)
}

/**
 * Format duration in milliseconds to a human-readable string
 * e.g., 720000 -> "12m"
 */
export function formatDurationShort(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`.padStart(2, '0')
  return `${minutes}m`
}

/**
 * Format a timestamp relative to now
 */
export function formatRelativeTime(date: Date | string): string {
  return formatDistance(parseDate(date), new Date(), { addSuffix: true })
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(date: Date | string, locale?: string): string {
  const d = parseDate(date)
  return d.toLocaleString(locale || 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Check if an incident is resolved
 */
export function isIncidentResolved(incident: Incident): boolean {
  return incident.currentStatus === 'resolved' || !!incident.resolvedAt
}

/**
 * Calculate overall incident duration
 */
export function calculateIncidentDuration(incident: Incident): number {
  const start = parseDate(incident.startAt)
  const end = incident.resolvedAt ? parseDate(incident.resolvedAt) : new Date()
  return differenceInMilliseconds(end, start)
}

/**
 * Get the display label for a status
 */
export function getStatusLabel(status: IncidentStatus): string {
  const labels: Record<IncidentStatus, string> = {
    investigating: 'Investigating',
    identified: 'Identified',
    monitoring: 'Monitoring',
    resolved: 'Resolved',
  }
  return labels[status]
}

/**
 * Get status color for badges/icons
 */
export function getStatusColor(status: IncidentStatus): string {
  const colors: Record<IncidentStatus, string> = {
    investigating: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    identified: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    monitoring: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    resolved: 'bg-green-500/10 text-green-600 border-green-500/20',
  }
  return colors[status]
}

/**
 * Assign an update to the correct stage based on timestamp and explicit status
 */
function assignUpdateToStage(
  update: IncidentUpdate,
  stages: TimelineStage[]
): IncidentUpdate {
  // If update has explicit status, keep it
  if (update.status) {
    return update
  }
  
  // Otherwise assign by timestamp
  const updateTime = parseDate(update.timestamp)
  
  for (const stage of stages) {
    if (updateTime >= stage.startTime && (!stage.endTime || updateTime < stage.endTime)) {
      return { ...update, status: stage.status }
    }
  }
  
  // Fallback: assign to first stage if before all stages
  if (stages.length > 0) {
    return { ...update, status: stages[0].status }
  }
  
  return update
}

/**
 * Build timeline stages from incident data
 */
export function buildTimelineStages(incident: Incident): TimelineStage[] {
  const statusChanges = [...incident.statusChanges]
    .sort((a, b) => parseDate(a.timestamp).getTime() - parseDate(b.timestamp).getTime())
  
  const stages: TimelineStage[] = []
  const resolved = isIncidentResolved(incident)
  const resolvedTime = incident.resolvedAt ? parseDate(incident.resolvedAt) : null
  
  // If no status changes, create a single stage from start to now/resolved
  if (statusChanges.length === 0) {
    const startTime = parseDate(incident.startAt)
    const endTime = resolved && resolvedTime ? resolvedTime : null
    
    stages.push({
      status: incident.currentStatus,
      startTime,
      endTime,
      duration: endTime 
        ? differenceInMilliseconds(endTime, startTime)
        : differenceInMilliseconds(new Date(), startTime),
      updates: [],
      isCurrent: !resolved,
      isResolved: incident.currentStatus === 'resolved',
    })
  } else {
    // Build stages from status changes
    for (let i = 0; i < statusChanges.length; i++) {
      const change = statusChanges[i]
      const startTime = parseDate(change.timestamp)
      const isLastChange = i === statusChanges.length - 1
      
      let endTime: Date | null = null
      
      if (isLastChange) {
        // Last stage
        if (change.status === 'resolved' && resolvedTime) {
          endTime = resolvedTime
        } else if (!resolved) {
          endTime = null // Ongoing
        } else if (resolvedTime) {
          endTime = resolvedTime
        }
      } else {
        // Not the last stage
        endTime = parseDate(statusChanges[i + 1].timestamp)
      }
      
      const duration = endTime 
        ? differenceInMilliseconds(endTime, startTime)
        : differenceInMilliseconds(new Date(), startTime)
      
      stages.push({
        status: change.status,
        startTime,
        endTime,
        duration,
        updates: [],
        isCurrent: isLastChange && !resolved && change.status !== 'resolved',
        isResolved: change.status === 'resolved',
      })
    }
  }
  
  // Assign updates to stages
  const updatesWithStatus = incident.updates.map(u => assignUpdateToStage(u, stages))
  
  // Distribute updates to their respective stages
  for (const stage of stages) {
    stage.updates = updatesWithStatus.filter(u => u.status === stage.status)
  }
  
  return stages
}

/**
 * Get the current stage from a list of stages
 */
export function getCurrentStage(stages: TimelineStage[]): TimelineStage | null {
  return stages.find(s => s.isCurrent) || stages.find(s => s.isResolved) || null
}
