// Outcome persistence layer - stores incident outcomes

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { Outcome, TeamMetrics, PeriodParam, VALID_PERIODS, DEFAULT_PERIOD } from '@/types/outcome'
import { incidentStore } from './incident-store'

const OUTCOMES_FILE = join(process.cwd(), 'data', 'outcomes.json')

// Ensure data directory exists
try {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true })
} catch {}

interface OutcomeStore {
  outcomes: Outcome[]
  lastUpdated: string
  version: number
}

function loadOutcomesFromFile(): Outcome[] {
  try {
    if (existsSync(OUTCOMES_FILE)) {
      const data = readFileSync(OUTCOMES_FILE, 'utf-8')
      const store: OutcomeStore = JSON.parse(data)
      return store.outcomes
    }
  } catch (error) {
    console.error('Failed to load outcomes from file:', error)
  }
  return []
}

function saveOutcomesToFile(outcomes: Outcome[]) {
  try {
    const store: OutcomeStore = {
      outcomes,
      lastUpdated: new Date().toISOString(),
      version: 1,
    }
    writeFileSync(OUTCOMES_FILE, JSON.stringify(store, null, 2))
  } catch (error) {
    console.error('Failed to save outcomes to file:', error)
  }
}

function generateId(): string {
  return `out-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export class OutcomeStoreManager {
  private outcomes: Outcome[]

  constructor() {
    this.outcomes = loadOutcomesFromFile()
  }

  getOutcomes(): Outcome[] {
    return [...this.outcomes].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  getOutcomeByIncidentId(incidentId: string): Outcome | null {
    return this.outcomes.find(o => o.incident_id === incidentId) || null
  }

  getOutcomeById(id: string): Outcome | null {
    return this.outcomes.find(o => o.id === id) || null
  }

  /**
   * Create a new outcome
   * @throws Error if incident doesn't exist or outcome already exists
   */
  createOutcome(data: {
    incident_id: string
    time_to_resolve_seconds: number
    root_cause: string
    satisfaction_score?: number
    resolved_by?: string
    notes?: string
  }): Outcome {
    // Validate time_to_resolve_seconds
    if (typeof data.time_to_resolve_seconds !== 'number' || 
        !Number.isInteger(data.time_to_resolve_seconds) ||
        data.time_to_resolve_seconds < 0) {
      throw new Error('INVALID_TIME_TO_RESOLVE')
    }

    // Validate incident exists
    const incident = incidentStore.getIncidentById(data.incident_id)
    if (!incident) {
      throw new Error('INCIDENT_NOT_FOUND')
    }

    // Check for existing outcome
    const existing = this.getOutcomeByIncidentId(data.incident_id)
    if (existing) {
      throw new Error('OUTCOME_ALREADY_EXISTS')
    }

    const now = new Date().toISOString()
    const outcome: Outcome = {
      id: generateId(),
      incident_id: data.incident_id,
      time_to_resolve_seconds: data.time_to_resolve_seconds,
      root_cause: data.root_cause,
      satisfaction_score: data.satisfaction_score,
      resolved_by: data.resolved_by,
      notes: data.notes,
      created_at: now,
      updated_at: now,
    }

    this.outcomes.push(outcome)
    saveOutcomesToFile(this.outcomes)
    return outcome
  }

  /**
   * Get outcomes within a date range
   */
  getOutcomesInRange(startDate: Date, endDate: Date): Outcome[] {
    return this.outcomes.filter(o => {
      const created = new Date(o.created_at).getTime()
      return created >= startDate.getTime() && created <= endDate.getTime()
    })
  }

  /**
   * Calculate team metrics for a given period
   */
  getTeamMetrics(period: PeriodParam = '30d'): TeamMetrics {
    const now = new Date()
    let days = 30
    if (period === '7d') days = 7
    if (period === '90d') days = 90

    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const endDate = now

    const outcomes = this.getOutcomesInRange(startDate, endDate)
    const totalIncidents = outcomes.length

    // Calculate average resolution time
    let avgResolutionTime = 0
    let medianResolutionTime = 0
    if (totalIncidents > 0) {
      const resolutionTimes = outcomes.map(o => o.time_to_resolve_seconds).sort((a, b) => a - b)
      avgResolutionTime = Math.round(
        resolutionTimes.reduce((sum, t) => sum + t, 0) / totalIncidents
      )
      const mid = Math.floor(resolutionTimes.length / 2)
      medianResolutionTime = resolutionTimes.length % 2 !== 0
        ? resolutionTimes[mid]
        : Math.round((resolutionTimes[mid - 1] + resolutionTimes[mid]) / 2)
    }

    // Calculate satisfaction score
    let avgSatisfaction = 0
    const satisfactionDistribution: Record<string, number> = {
      '1': 0, '2': 0, '3': 0, '4': 0, '5': 0
    }
    const outcomesWithScore = outcomes.filter(o => o.satisfaction_score !== undefined && o.satisfaction_score !== null)
    if (outcomesWithScore.length > 0) {
      const totalScore = outcomesWithScore.reduce((sum, o) => sum + (o.satisfaction_score || 0), 0)
      avgSatisfaction = Math.round((totalScore / outcomesWithScore.length) * 10) / 10
      outcomesWithScore.forEach(o => {
        const score = String(o.satisfaction_score)
        if (satisfactionDistribution[score] !== undefined) {
          satisfactionDistribution[score]++
        }
      })
    }

    // Calculate top root causes
    const rootCauseCounts: Record<string, number> = {}
    outcomes.forEach(o => {
      // Normalize root cause (take first 50 chars as key for grouping similar causes)
      const key = o.root_cause.substring(0, 50).toLowerCase()
      rootCauseCounts[key] = (rootCauseCounts[key] || 0) + 1
    })
    const topRootCauses = Object.entries(rootCauseCounts)
      .map(([cause, count]) => ({ cause: outcomes.find(o => o.root_cause.substring(0, 50).toLowerCase() === cause)?.root_cause || cause, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Get total resolved incidents in period
    const incidentsInPeriod = incidentStore.getIncidents().filter(i => {
      const created = new Date(i.startedAt).getTime()
      return created >= startDate.getTime() && created <= endDate.getTime()
    })
    const totalResolved = incidentsInPeriod.filter(i => i.status === 'resolved').length

    return {
      period,
      total_incidents: totalIncidents,
      total_resolved: totalResolved,
      average_resolution_time_seconds: avgResolutionTime,
      median_resolution_time_seconds: medianResolutionTime,
      average_satisfaction_score: avgSatisfaction,
      satisfaction_distribution: satisfactionDistribution,
      top_root_causes: topRootCauses,
    }
  }
}

// Export singleton instance
export const outcomeStore = new OutcomeStoreManager()

// Also export for API routes
export function getOutcomeStore() {
  return outcomeStore
}
