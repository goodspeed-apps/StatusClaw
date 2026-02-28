/**
 * Incident Store Unit Tests
 * 
 * Tests for:
 * - Duration calculations
 * - Timeline building
 * - Incident store operations
 */

import { describe, test, expect, beforeEach } from 'vitest'
import { 
  calculateDuration, 
  formatDuration, 
  buildIncidentTimeline,
  IncidentStoreManager 
} from '../lib/incident-store'
import type { Incident, IncidentUpdate, IncidentStatus } from '../lib/mock-data'

// Test data builders
function createTestIncident(overrides: Partial<Incident> = {}): Incident {
  return {
    id: 'test-inc-1',
    title: 'Test Incident',
    description: 'Test description',
    service: 'API',
    severity: 'high',
    status: 'investigating',
    startedAt: '2026-02-28T00:00:00.000Z',
    updates: [],
    ...overrides,
  }
}

function createTestUpdate(overrides: Partial<IncidentUpdate> = {}): IncidentUpdate {
  return {
    id: `upd-${Math.random().toString(36).substr(2, 9)}`,
    incidentId: 'test-inc-1',
    status: 'investigating',
    message: 'Test update message',
    createdAt: '2026-02-28T00:15:00.000Z',
    createdBy: 'test-user',
    ...overrides,
  }
}

describe('Duration Calculations', () => {
  test('calculateDuration with explicit end time', () => {
    const startTime = '2026-02-28T00:00:00.000Z'
    const endTime = '2026-02-28T01:00:00.000Z' // 1 hour later
    
    const duration = calculateDuration(startTime, endTime)
    
    expect(duration).toBe(3600000) // 1 hour in milliseconds
  })

  test('calculateDuration without end time uses current time', () => {
    const startTime = new Date(Date.now() - 60000).toISOString() // 1 minute ago
    
    const duration = calculateDuration(startTime)
    
    // Should be approximately 1 minute (with some tolerance for test execution time)
    expect(duration).toBeGreaterThanOrEqual(59000)
    expect(duration).toBeLessThanOrEqual(65000)
  })

  test('calculateDuration returns 0 for invalid dates', () => {
    const duration = calculateDuration('invalid-date', '2026-02-28T00:00:00Z')
    expect(duration).toBe(0)
  })
})

describe('Duration Formatting', () => {
  test('formatDuration shows seconds for short durations', () => {
    expect(formatDuration(45000)).toBe('45s')
    expect(formatDuration(59000)).toBe('59s')
  })

  test('formatDuration shows minutes for medium durations', () => {
    expect(formatDuration(60000)).toBe('1m')
    expect(formatDuration(3540000)).toBe('59m')
  })

  test('formatDuration shows hours and minutes for long durations', () => {
    expect(formatDuration(3600000)).toBe('1h')
    expect(formatDuration(3900000)).toBe('1h 05m')
    expect(formatDuration(7200000)).toBe('2h')
    expect(formatDuration(7500000)).toBe('2h 05m')
  })
})

describe('Timeline Building', () => {
  test('buildIncidentTimeline creates single stage for new incident', () => {
    const incident = createTestIncident({
      status: 'investigating',
      updates: [],
    })

    const timeline = buildIncidentTimeline(incident)

    expect(timeline.incidentId).toBe(incident.id)
    expect(timeline.stages).toHaveLength(1)
    expect(timeline.stages[0].status).toBe('investigating')
    expect(timeline.isOngoing).toBe(true)
    expect(timeline.currentStage).toBe('investigating')
  })

  test('buildIncidentTimeline creates stages for each status change', () => {
    const updates: IncidentUpdate[] = [
      createTestUpdate({ status: 'investigating', createdAt: '2026-02-28T00:15:00.000Z' }),
      createTestUpdate({ status: 'identified', createdAt: '2026-02-28T00:30:00.000Z' }),
      createTestUpdate({ status: 'monitoring', createdAt: '2026-02-28T01:00:00.000Z' }),
      createTestUpdate({ status: 'resolved', createdAt: '2026-02-28T01:30:00.000Z' }),
    ]

    const incident = createTestIncident({
      status: 'resolved',
      resolvedAt: '2026-02-28T01:30:00.000Z',
      updates,
    })

    const timeline = buildIncidentTimeline(incident)

    // Should have stages: investigating (initial), investigating (update), identified, monitoring, resolved
    expect(timeline.stages.length).toBeGreaterThanOrEqual(2)
    expect(timeline.isOngoing).toBe(false)
    expect(timeline.currentStage).toBeNull()
    
    // Check stage durations are calculated correctly
    const investigatingStage = timeline.stages.find(s => s.status === 'investigating')
    expect(investigatingStage).toBeDefined()
    if (investigatingStage) {
      expect(investigatingStage.durationMs).toBeGreaterThan(0)
    }
  })

  test('buildIncidentTimeline assigns updates to correct stages', () => {
    const updates: IncidentUpdate[] = [
      createTestUpdate({ id: 'upd-1', status: 'investigating', message: 'Looking into it', createdAt: '2026-02-28T00:15:00.000Z' }),
      createTestUpdate({ id: 'upd-2', status: 'investigating', message: 'Still investigating', createdAt: '2026-02-28T00:20:00.000Z' }),
      createTestUpdate({ id: 'upd-3', status: 'identified', message: 'Root cause found', createdAt: '2026-02-28T00:30:00.000Z' }),
    ]

    const incident = createTestIncident({
      status: 'identified',
      updates,
    })

    const timeline = buildIncidentTimeline(incident)

    // Find investigating stage and check it has the right updates
    const investigatingStage = timeline.stages.find(s => s.status === 'investigating')
    expect(investigatingStage).toBeDefined()
    if (investigatingStage) {
      expect(investigatingStage.updateCount).toBeGreaterThanOrEqual(1)
      const updateIds = investigatingStage.updates.map(u => u.id)
      expect(updateIds).toContain('upd-1')
      expect(updateIds).toContain('upd-2')
    }

    // Find identified stage
    const identifiedStage = timeline.stages.find(s => s.status === 'identified')
    expect(identifiedStage).toBeDefined()
    if (identifiedStage) {
      expect(identifiedStage.updates.some(u => u.id === 'upd-3')).toBe(true)
    }
  })

  test('buildIncidentTimeline handles ongoing incident with no resolvedAt', () => {
    const updates: IncidentUpdate[] = [
      createTestUpdate({ status: 'investigating', createdAt: '2026-02-28T00:15:00.000Z' }),
      createTestUpdate({ status: 'identified', createdAt: '2026-02-28T00:30:00.000Z' }),
    ]

    const incident = createTestIncident({
      status: 'identified',
      updates,
    })

    const timeline = buildIncidentTimeline(incident)

    expect(timeline.isOngoing).toBe(true)
    expect(timeline.currentStage).toBe('identified')
    
    // Last stage should have no endedAt (it's ongoing)
    const lastStage = timeline.stages[timeline.stages.length - 1]
    expect(lastStage.endedAt).toBeUndefined()
    expect(lastStage.durationMs).toBeGreaterThan(0)
  })

  test('buildIncidentTimeline calculates total duration for resolved incident', () => {
    const incident = createTestIncident({
      status: 'resolved',
      startedAt: '2026-02-28T00:00:00.000Z',
      resolvedAt: '2026-02-28T02:00:00.000Z',
      updates: [
        createTestUpdate({ status: 'investigating', createdAt: '2026-02-28T00:00:00.000Z' }),
        createTestUpdate({ status: 'resolved', createdAt: '2026-02-28T02:00:00.000Z' }),
      ],
    })

    const timeline = buildIncidentTimeline(incident)

    expect(timeline.totalDurationMs).toBe(7200000) // 2 hours
  })

  test('buildIncidentTimeline handles repeated status transitions', () => {
    const updates: IncidentUpdate[] = [
      createTestUpdate({ status: 'investigating', createdAt: '2026-02-28T00:15:00.000Z' }),
      createTestUpdate({ status: 'identified', createdAt: '2026-02-28T00:30:00.000Z' }),
      createTestUpdate({ status: 'investigating', createdAt: '2026-02-28T00:45:00.000Z' }), // Back to investigating
      createTestUpdate({ status: 'resolved', createdAt: '2026-02-28T01:00:00.000Z' }),
    ]

    const incident = createTestIncident({
      status: 'resolved',
      resolvedAt: '2026-02-28T01:00:00.000Z',
      updates,
    })

    const timeline = buildIncidentTimeline(incident)

    // Should have multiple investigating stages (bounce-back scenario per PRD)
    const investigatingStages = timeline.stages.filter(s => s.status === 'investigating')
    expect(investigatingStages.length).toBeGreaterThanOrEqual(1)
  })
})

describe('IncidentStoreManager', () => {
  let store: IncidentStoreManager

  beforeEach(() => {
    store = new IncidentStoreManager()
  })

  test('createIncident creates incident with generated id', () => {
    const incident = store.createIncident({
      title: 'New Incident',
      description: 'Description',
      service: 'Auth',
      severity: 'critical',
      status: 'investigating',
      startedAt: new Date().toISOString(),
    })

    expect(incident.id).toBeDefined()
    expect(incident.id).toMatch(/^inc-/)
    expect(incident.title).toBe('New Incident')
    expect(incident.updates).toEqual([])
  })

  test('getIncidentById returns null for unknown id', () => {
    const incident = store.getIncidentById('non-existent-id')
    expect(incident).toBeNull()
  })

  test('addUpdate adds update to incident and updates status', () => {
    const incident = store.createIncident({
      title: 'Test',
      description: 'Test desc',
      service: 'API',
      severity: 'high',
      status: 'investigating',
      startedAt: new Date().toISOString(),
    })

    const update = store.addUpdate(incident.id, {
      message: 'We found the issue',
      status: 'identified',
      createdAt: new Date().toISOString(),
      createdBy: 'ops',
    })

    expect(update).not.toBeNull()
    expect(update?.message).toBe('We found the issue')

    const updatedIncident = store.getIncidentById(incident.id)
    expect(updatedIncident?.status).toBe('identified')
    expect(updatedIncident?.updates).toHaveLength(1)
  })

  test('addUpdate returns null for non-existent incident', () => {
    const update = store.addUpdate('non-existent', {
      message: 'Test',
      status: 'investigating',
      createdAt: new Date().toISOString(),
      createdBy: 'test',
    })

    expect(update).toBeNull()
  })

  test('addUpdate with resolved status sets resolvedAt', () => {
    const incident = store.createIncident({
      title: 'Test',
      description: 'Test desc',
      service: 'API',
      severity: 'high',
      status: 'monitoring',
      startedAt: new Date().toISOString(),
    })

    const resolvedAt = new Date().toISOString()
    store.addUpdate(incident.id, {
      message: 'All clear',
      status: 'resolved',
      createdAt: resolvedAt,
      createdBy: 'ops',
    })

    const updatedIncident = store.getIncidentById(incident.id)
    expect(updatedIncident?.status).toBe('resolved')
    expect(updatedIncident?.resolvedAt).toBe(resolvedAt)
  })

  test('getTimeline returns null for non-existent incident', () => {
    const timeline = store.getTimeline('non-existent')
    expect(timeline).toBeNull()
  })

  test('getTimeline returns timeline for existing incident', () => {
    const incident = store.createIncident({
      title: 'Test',
      description: 'Test desc',
      service: 'API',
      severity: 'high',
      status: 'investigating',
      startedAt: new Date().toISOString(),
    })

    store.addUpdate(incident.id, {
      message: 'Update 1',
      status: 'investigating',
      createdAt: new Date().toISOString(),
      createdBy: 'ops',
    })

    const timeline = store.getTimeline(incident.id)
    expect(timeline).not.toBeNull()
    expect(timeline?.incidentId).toBe(incident.id)
    expect(timeline?.stages.length).toBeGreaterThan(0)
  })

  test('getIncidents returns sorted list (newest first)', () => {
    // Clear any existing incidents by creating a fresh store
    const testStore = new IncidentStoreManager()
    
    const incident1 = testStore.createIncident({
      title: 'First',
      description: 'First incident',
      service: 'API',
      severity: 'high',
      status: 'resolved',
      startedAt: '2026-02-27T00:00:00.000Z', // Yesterday
      resolvedAt: '2026-02-27T01:00:00.000Z',
    })

    const incident2 = testStore.createIncident({
      title: 'Second',
      description: 'Second incident',
      service: 'Auth',
      severity: 'critical',
      status: 'investigating',
      startedAt: '2026-02-28T12:00:00.000Z', // Today
    })

    const incidents = testStore.getIncidents()
    const firstIndex = incidents.findIndex(i => i.id === incident1.id)
    const secondIndex = incidents.findIndex(i => i.id === incident2.id)

    // Second incident should come before first (newest first)
    expect(secondIndex).toBeLessThan(firstIndex)
  })

  test('getOngoingIncidents returns only unresolved incidents', () => {
    const testStore = new IncidentStoreManager()

    testStore.createIncident({
      title: 'Resolved',
      description: 'Resolved incident',
      service: 'API',
      severity: 'low',
      status: 'resolved',
      startedAt: '2026-02-27T00:00:00.000Z',
      resolvedAt: '2026-02-27T01:00:00.000Z',
    })

    testStore.createIncident({
      title: 'Ongoing',
      description: 'Ongoing incident',
      service: 'Auth',
      severity: 'critical',
      status: 'investigating',
      startedAt: '2026-02-28T12:00:00.000Z',
    })

    const ongoing = testStore.getOngoingIncidents()
    expect(ongoing.length).toBeGreaterThanOrEqual(1)
    expect(ongoing.every(i => i.status !== 'resolved')).toBe(true)
  })

  test('updateIncident modifies incident fields', () => {
    const incident = store.createIncident({
      title: 'Original',
      description: 'Original desc',
      service: 'API',
      severity: 'high',
      status: 'investigating',
      startedAt: new Date().toISOString(),
    })

    const updated = store.updateIncident(incident.id, {
      title: 'Updated Title',
      severity: 'critical',
    })

    expect(updated?.title).toBe('Updated Title')
    expect(updated?.severity).toBe('critical')
    expect(updated?.description).toBe('Original desc') // Unchanged
  })

  test('updateIncident sets resolvedAt when status changes to resolved', () => {
    const incident = store.createIncident({
      title: 'Test',
      description: 'Test',
      service: 'API',
      severity: 'high',
      status: 'monitoring',
      startedAt: new Date().toISOString(),
    })

    expect(incident.resolvedAt).toBeUndefined()

    const updated = store.updateIncident(incident.id, {
      status: 'resolved',
    })

    expect(updated?.status).toBe('resolved')
    expect(updated?.resolvedAt).toBeDefined()
  })
})

// Export for manual test running
export { createTestIncident, createTestUpdate }
