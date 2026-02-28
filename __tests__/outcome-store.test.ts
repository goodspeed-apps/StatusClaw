import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OutcomeStoreManager } from '@/lib/outcome-store'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

// Constants
const OUTCOMES_FILE = join(process.cwd(), 'data', 'outcomes.json')

// Helper to clear outcomes file
function clearOutcomesFile() {
  try {
    if (existsSync(OUTCOMES_FILE)) {
      writeFileSync(OUTCOMES_FILE, JSON.stringify({ outcomes: [], lastUpdated: new Date().toISOString(), version: 1 }, null, 2))
    }
  } catch (e) {
    // ignore
  }
}

// Mock the incident store
const mockGetIncidentById = vi.fn()
const mockGetIncidents = vi.fn().mockReturnValue([])

vi.mock('@/lib/incident-store', () => ({
  incidentStore: {
    getIncidentById: (...args: any[]) => mockGetIncidentById(...args),
    getIncidents: (...args: any[]) => mockGetIncidents(...args),
  },
}))

describe('OutcomeStoreManager', () => {
  let store: OutcomeStoreManager

  beforeEach(() => {
    clearOutcomesFile()
    store = new OutcomeStoreManager()
    vi.clearAllMocks()
    mockGetIncidents.mockReturnValue([])
  })

  describe('createOutcome', () => {
    it('should create an outcome for an existing incident', () => {
      mockGetIncidentById.mockReturnValue({ id: 'inc-123', status: 'resolved' })

      const outcome = store.createOutcome({
        incident_id: 'inc-123',
        time_to_resolve_seconds: 1800,
        root_cause: 'Database connection pool exhausted',
        satisfaction_score: 4,
        resolved_by: 'user-123',
        notes: 'Additional context',
      })

      expect(outcome).toBeDefined()
      expect(outcome.id).toBeDefined()
      expect(outcome.incident_id).toBe('inc-123')
      expect(outcome.time_to_resolve_seconds).toBe(1800)
      expect(outcome.root_cause).toBe('Database connection pool exhausted')
      expect(outcome.satisfaction_score).toBe(4)
      expect(outcome.resolved_by).toBe('user-123')
      expect(outcome.notes).toBe('Additional context')
      expect(outcome.created_at).toBeDefined()
      expect(outcome.updated_at).toBeDefined()
    })

    it('should throw INCIDENT_NOT_FOUND when incident does not exist', () => {
      mockGetIncidentById.mockReturnValue(null)

      expect(() =>
        store.createOutcome({
          incident_id: 'non-existent',
          time_to_resolve_seconds: 1800,
          root_cause: 'Test',
        })
      ).toThrow('INCIDENT_NOT_FOUND')
    })

    it('should throw OUTCOME_ALREADY_EXISTS when outcome already exists for same incident', () => {
      mockGetIncidentById.mockReturnValue({ id: 'inc-dup', status: 'resolved' })

      // Create first outcome
      store.createOutcome({
        incident_id: 'inc-dup',
        time_to_resolve_seconds: 1800,
        root_cause: 'Test cause',
      })

      // Try to create another outcome for the same incident
      expect(() => {
        store.createOutcome({
          incident_id: 'inc-dup',
          time_to_resolve_seconds: 2000,
          root_cause: 'Another cause',
        })
      }).toThrow('OUTCOME_ALREADY_EXISTS')
    })

    it('should allow optional satisfaction_score to be omitted', () => {
      mockGetIncidentById.mockReturnValue({ id: 'inc-opt', status: 'resolved' })

      const outcome = store.createOutcome({
        incident_id: 'inc-opt',
        time_to_resolve_seconds: 1800,
        root_cause: 'Test cause',
      })

      expect(outcome.satisfaction_score).toBeUndefined()
    })

    it('should reject negative time_to_resolve_seconds', () => {
      mockGetIncidentById.mockReturnValue({ id: 'inc-123', status: 'resolved' })

      expect(() =>
        store.createOutcome({
          incident_id: 'inc-123',
          time_to_resolve_seconds: -100,
          root_cause: 'Test cause',
        })
      ).toThrow()
    })
  })

  describe('getOutcomeByIncidentId', () => {
    it('should return outcome for existing incident', () => {
      mockGetIncidentById.mockReturnValue({ id: 'inc-find', status: 'resolved' })

      const created = store.createOutcome({
        incident_id: 'inc-find',
        time_to_resolve_seconds: 1800,
        root_cause: 'Test cause',
      })

      const found = store.getOutcomeByIncidentId('inc-find')
      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
    })

    it('should return null for non-existent incident', () => {
      const found = store.getOutcomeByIncidentId('non-existent-id')
      expect(found).toBeNull()
    })
  })

  describe('getTeamMetrics', () => {
    it('should return default metrics for empty store', () => {
      const metrics = store.getTeamMetrics('30d')

      expect(metrics).toBeDefined()
      expect(metrics.period).toBe('30d')
      expect(metrics.total_incidents).toBe(0)
      expect(metrics.total_resolved).toBe(0)
      expect(metrics.average_resolution_time_seconds).toBe(0)
      expect(metrics.median_resolution_time_seconds).toBe(0)
      expect(metrics.average_satisfaction_score).toBe(0)
      expect(metrics.satisfaction_distribution).toEqual({
        '1': 0, '2': 0, '3': 0, '4': 0, '5': 0
      })
      expect(metrics.top_root_causes).toEqual([])
    })

    it('should calculate correct average resolution time', () => {
      mockGetIncidentById.mockReturnValue({ id: 'inc-metric', status: 'resolved' })

      store.createOutcome({
        incident_id: 'inc-metric',
        time_to_resolve_seconds: 1000,
        root_cause: 'Cause A',
      })

      const metrics = store.getTeamMetrics('30d')
      expect(metrics.total_incidents).toBe(1)
      expect(metrics.average_resolution_time_seconds).toBe(1000)
    })

    it('should respect period parameter', () => {
      const metrics7d = store.getTeamMetrics('7d')
      const metrics30d = store.getTeamMetrics('30d')
      const metrics90d = store.getTeamMetrics('90d')

      expect(metrics7d.period).toBe('7d')
      expect(metrics30d.period).toBe('30d')
      expect(metrics90d.period).toBe('90d')
    })
  })
})
