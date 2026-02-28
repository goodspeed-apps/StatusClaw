/**
 * Types for the Incident Timeline Component
 * Based on PRD: Incident Timeline Component (StatusClaw)
 */

export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved'

export interface IncidentStatusChange {
  id: string
  status: IncidentStatus
  timestamp: Date | string
  createdBy?: string
  note?: string
}

export interface IncidentUpdate {
  id: string
  incidentId: string
  timestamp: Date | string
  title: string
  body: string
  status?: IncidentStatus
  createdBy?: string
}

export interface Incident {
  id: string
  title: string
  description?: string
  startAt: Date | string
  resolvedAt?: Date | string
  currentStatus: IncidentStatus
  statusChanges: IncidentStatusChange[]
  updates: IncidentUpdate[]
  severity?: 'low' | 'medium' | 'high' | 'critical'
  affectedServices?: string[]
}

export interface TimelineStage {
  status: IncidentStatus
  startTime: Date
  endTime: Date | null
  duration: number // milliseconds
  updates: IncidentUpdate[]
  isCurrent: boolean
  isResolved: boolean
}
