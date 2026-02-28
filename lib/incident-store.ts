// Incident persistence layer - stores incidents and calculates timeline data

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { Incident, IncidentStatus, IncidentUpdate, IncidentTimeline, TimelineStage } from './mock-data'
import { INCIDENT_STATUS_CONFIG } from './mock-data'

const INCIDENTS_FILE = join(process.cwd(), 'data', 'incidents.json')

// Ensure data directory exists
try {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true })
} catch {}

interface IncidentStore {
  incidents: Incident[]
  lastUpdated: string
  version: number
}

function loadIncidentsFromFile(): Incident[] {
  try {
    if (existsSync(INCIDENTS_FILE)) {
      const data = readFileSync(INCIDENTS_FILE, 'utf-8')
      const store: IncidentStore = JSON.parse(data)
      return store.incidents
    }
  } catch (error) {
    console.error('Failed to load incidents from file:', error)
  }
  return []
}

function saveIncidentsToFile(incidents: Incident[]) {
  try {
    const store: IncidentStore = {
      incidents,
      lastUpdated: new Date().toISOString(),
      version: 1,
    }
    writeFileSync(INCIDENTS_FILE, JSON.stringify(store, null, 2))
  } catch (error) {
    console.error('Failed to save incidents to file:', error)
  }
}

/**
 * Calculate time spent in milliseconds between two timestamps
 */
export function calculateDuration(startTime: string, endTime?: string): number {
  const start = new Date(startTime).getTime()
  const end = endTime ? new Date(endTime).getTime() : Date.now()
  // Return 0 if either date is invalid (NaN)
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 0
  }
  return Math.max(0, end - start)
}

/**
 * Format duration in human-readable format (e.g., "12m", "1h 05m")
 */
export function formatDuration(ms: number): string {
  if (ms < 60000) {
    return `${Math.floor(ms / 1000)}s`
  }
  if (ms < 3600000) {
    return `${Math.floor(ms / 60000)}m`
  }
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  if (minutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`
}

/**
 * Build timeline stages from incident status changes
 * Maps updates to their respective stages
 */
export function buildIncidentTimeline(incident: Incident): IncidentTimeline {
  const now = new Date().toISOString()
  const updates = [...incident.updates].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  // Get all unique status transitions from updates
  const statusChanges: { status: IncidentStatus; timestamp: string }[] = []
  
  // Add initial status (from first update if exists, otherwise from incident)
  // The first update represents the initial status at incident creation
  if (updates.length > 0) {
    statusChanges.push({
      status: updates[0].status,
      timestamp: incident.startedAt,
    })
  } else {
    // No updates - use current incident status
    statusChanges.push({
      status: incident.status,
      timestamp: incident.startedAt,
    })
  }
  
  // Add status changes from updates (skip first update as it's the initial state)
  for (let i = 1; i < updates.length; i++) {
    const update = updates[i]
    const lastChange = statusChanges[statusChanges.length - 1]
    if (lastChange.status !== update.status) {
      statusChanges.push({
        status: update.status,
        timestamp: update.createdAt,
      })
    }
  }

  // Build stages
  const stages: TimelineStage[] = []
  for (let i = 0; i < statusChanges.length; i++) {
    const change = statusChanges[i]
    const nextChange = statusChanges[i + 1]
    
    const stageStart = change.timestamp
    const stageEnd = nextChange?.timestamp || (incident.status === 'resolved' ? incident.resolvedAt : undefined)
    
    // Get updates for this stage
    // Primary rule: updates that explicitly reference this stage status
    // Fallback rule: updates by timestamp within stage boundaries
    const stageUpdates = updates.filter(u => {
      // Explicit status match takes priority
      if (u.status === change.status) {
        const updateTime = new Date(u.createdAt).getTime()
        const stageStartTime = new Date(stageStart).getTime()
        const stageEndTime = stageEnd ? new Date(stageEnd).getTime() : Infinity
        return updateTime >= stageStartTime && updateTime < stageEndTime
      }
      return false
    })

    stages.push({
      status: change.status,
      label: INCIDENT_STATUS_CONFIG[change.status].label,
      startedAt: stageStart,
      endedAt: stageEnd,
      durationMs: calculateDuration(stageStart, stageEnd),
      updateCount: stageUpdates.length,
      updates: stageUpdates,
    })
  }

  // Calculate total duration
  const totalDurationMs = incident.resolvedAt
    ? calculateDuration(incident.startedAt, incident.resolvedAt)
    : calculateDuration(incident.startedAt)

  return {
    incidentId: incident.id,
    incident,
    stages,
    totalDurationMs,
    isOngoing: incident.status !== 'resolved',
    currentStage: incident.status !== 'resolved' ? incident.status : null,
  }
}

// Export singleton store
export class IncidentStoreManager {
  private incidents: Incident[]

  constructor() {
    this.incidents = loadIncidentsFromFile()
  }

  getIncidents(): Incident[] {
    return [...this.incidents].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )
  }

  getIncidentById(id: string): Incident | null {
    return this.incidents.find(i => i.id === id) || null
  }

  getIncidentsByStatus(status: IncidentStatus): Incident[] {
    return this.incidents.filter(i => i.status === status)
  }

  getOngoingIncidents(): Incident[] {
    return this.incidents.filter(i => i.status !== 'resolved')
  }

  createIncident(incident: Omit<Incident, 'id' | 'updates'>): Incident {
    const newIncident: Incident = {
      ...incident,
      id: `inc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      updates: [],
    }
    this.incidents.push(newIncident)
    saveIncidentsToFile(this.incidents)
    return newIncident
  }

  addUpdate(
    incidentId: string,
    update: Omit<IncidentUpdate, 'id' | 'incidentId'>
  ): IncidentUpdate | null {
    const incident = this.incidents.find(i => i.id === incidentId)
    if (!incident) return null

    const newUpdate: IncidentUpdate = {
      ...update,
      id: `upd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      incidentId,
    }

    incident.updates.push(newUpdate)
    
    // Update incident status if this update has a different status
    if (update.status !== incident.status) {
      incident.status = update.status
    }

    // If resolved, set resolvedAt
    if (update.status === 'resolved' && !incident.resolvedAt) {
      incident.resolvedAt = update.createdAt
    }

    saveIncidentsToFile(this.incidents)
    return newUpdate
  }

  updateIncident(incidentId: string, updates: Partial<Incident>): Incident | null {
    const index = this.incidents.findIndex(i => i.id === incidentId)
    if (index === -1) return null

    this.incidents[index] = {
      ...this.incidents[index],
      ...updates,
    }

    // If status is resolved, ensure resolvedAt is set
    if (updates.status === 'resolved' && !this.incidents[index].resolvedAt) {
      this.incidents[index].resolvedAt = new Date().toISOString()
    }

    saveIncidentsToFile(this.incidents)
    return this.incidents[index]
  }

  getTimeline(incidentId: string): IncidentTimeline | null {
    const incident = this.incidents.find(i => i.id === incidentId)
    if (!incident) return null

    return buildIncidentTimeline(incident)
  }
}

// Export singleton instance
export const incidentStore = new IncidentStoreManager()

// Also export for API routes
export function getIncidentStore() {
  return incidentStore
}
