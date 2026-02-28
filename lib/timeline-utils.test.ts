/**
 * Tests for timeline utility functions
 */

import { describe, it, expect } from 'vitest'
import {
  parseDate,
  formatDurationShort,
  formatTimestamp,
  isIncidentResolved,
  calculateIncidentDuration,
  getStatusLabel,
  getStatusColor,
  buildTimelineStages,
} from '@/lib/timeline-utils'
import type { Incident, IncidentStatus } from '@/types/incident'

describe('parseDate', () => {
  it('should return Date object when given a Date', () => {
    const date = new Date('2024-02-28T10:00:00Z')
    expect(parseDate(date)).toBe(date)
  })

  it('should parse string to Date', () => {
    const result = parseDate('2024-02-28T10:00:00Z')
    expect(result).toBeInstanceOf(Date)
    expect(result.toISOString()).toBe('2024-02-28T10:00:00.000Z')
  })
})

describe('formatDurationShort', () => {
  it('should format minutes correctly', () => {
    expect(formatDurationShort(12 * 60 * 1000)).toBe('12m')
    expect(formatDurationShort(5 * 60 * 1000)).toBe('5m')
  })

  it('should format hours and minutes correctly', () => {
    expect(formatDurationShort(75 * 60 * 1000)).toBe('1h 15m')
    expect(formatDurationShort(125 * 60 * 1000)).toBe('2h 5m')
  })

  it('should format days correctly', () => {
    expect(formatDurationShort(25 * 60 * 60 * 1000)).toBe('1d 1h')
    expect(formatDurationShort(48 * 60 * 60 * 1000)).toBe('2d 0h')
  })
})

describe('formatTimestamp', () => {
  it('should format date for display', () => {
    const result = formatTimestamp('2024-02-28T10:30:00Z')
    expect(result).toContain('Feb')
    expect(result).toContain('28')
  })
})

describe('isIncidentResolved', () => {
  it('should return true for resolved status', () => {
    const incident: Partial<Incident> = {
      currentStatus: 'resolved',
      resolvedAt: '2024-02-28T10:00:00Z',
    }
    expect(isIncidentResolved(incident as Incident)).toBe(true)
  })

  it('should return true when resolvedAt is set', () => {
    const incident: Partial<Incident> = {
      currentStatus: 'monitoring',
      resolvedAt: '2024-02-28T10:00:00Z',
    }
    expect(isIncidentResolved(incident as Incident)).toBe(true)
  })

  it('should return false for unresolved incidents', () => {
    const incident: Partial<Incident> = {
      currentStatus: 'investigating',
    }
    expect(isIncidentResolved(incident as Incident)).toBe(false)
  })
})

describe('calculateIncidentDuration', () => {
  it('should calculate duration for resolved incident', () => {
    const incident: Partial<Incident> = {
      startAt: '2024-02-28T08:00:00Z',
      resolvedAt: '2024-02-28T10:00:00Z',
    }
    const duration = calculateIncidentDuration(incident as Incident)
    expect(duration).toBe(2 * 60 * 60 * 1000) // 2 hours in ms
  })

  it('should calculate duration from start to now for ongoing incident', () => {
    const startAt = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
    const incident: Partial<Incident> = {
      startAt,
    }
    const duration = calculateIncidentDuration(incident as Incident)
    expect(duration).toBeGreaterThanOrEqual(60 * 60 * 1000 - 1000) // ~1 hour, with small tolerance
    expect(duration).toBeLessThanOrEqual(60 * 60 * 1000 + 5000) // Small upper tolerance
  })
})

describe('getStatusLabel', () => {
  it('should return correct labels for all statuses', () => {
    expect(getStatusLabel('investigating')).toBe('Investigating')
    expect(getStatusLabel('identified')).toBe('Identified')
    expect(getStatusLabel('monitoring')).toBe('Monitoring')
    expect(getStatusLabel('resolved')).toBe('Resolved')
  })
})

describe('getStatusColor', () => {
  it('should return color classes for each status', () => {
    const investigating = getStatusColor('investigating')
    expect(investigating).toContain('yellow')

    const identified = getStatusColor('identified')
    expect(identified).toContain('orange')

    const monitoring = getStatusColor('monitoring')
    expect(monitoring).toContain('blue')

    const resolved = getStatusColor('resolved')
    expect(resolved).toContain('green')
  })
})

describe('buildTimelineStages', () => {
  const baseIncident: Incident = {
    id: 'inc-1',
    title: 'Test Incident',
    startAt: '2024-02-28T08:00:00Z',
    currentStatus: 'resolved',
    resolvedAt: '2024-02-28T12:00:00Z',
    statusChanges: [
      { id: 'sc1', status: 'investigating', timestamp: '2024-02-28T08:00:00Z' },
      { id: 'sc2', status: 'identified', timestamp: '2024-02-28T09:00:00Z' },
      { id: 'sc3', status: 'monitoring', timestamp: '2024-02-28T10:00:00Z' },
      { id: 'sc4', status: 'resolved', timestamp: '2024-02-28T12:00:00Z' },
    ],
    updates: [],
  }

  it('should build stages from status changes', () => {
    const stages = buildTimelineStages(baseIncident)
    expect(stages).toHaveLength(4)
    expect(stages[0].status).toBe('investigating')
    expect(stages[1].status).toBe('identified')
    expect(stages[2].status).toBe('monitoring')
    expect(stages[3].status).toBe('resolved')
  })

  it('should calculate stage durations correctly', () => {
    const stages = buildTimelineStages(baseIncident)
    expect(stages[0].duration).toBe(60 * 60 * 1000) // 1 hour
    expect(stages[1].duration).toBe(60 * 60 * 1000) // 1 hour
    expect(stages[2].duration).toBe(2 * 60 * 60 * 1000) // 2 hours
  })

  it('should mark resolved stage correctly', () => {
    const stages = buildTimelineStages(baseIncident)
    expect(stages[3].isResolved).toBe(true)
    expect(stages[3].isCurrent).toBe(false)
  })

  it('should handle ongoing incident', () => {
    const ongoingIncident: Incident = {
      ...baseIncident,
      currentStatus: 'monitoring',
      resolvedAt: undefined,
      statusChanges: baseIncident.statusChanges.slice(0, 3),
    }
    const stages = buildTimelineStages(ongoingIncident)
    expect(stages).toHaveLength(3)
    expect(stages[2].isCurrent).toBe(true)
    expect(stages[2].endTime).toBeNull()
  })

  it('should assign updates to correct stages by timestamp', () => {
    const incidentWithUpdates: Incident = {
      ...baseIncident,
      updates: [
        { id: 'u1', incidentId: 'inc-1', title: 'Update 1', body: 'Body 1', timestamp: '2024-02-28T08:30:00Z' },
        { id: 'u2', incidentId: 'inc-1', title: 'Update 2', body: 'Body 2', timestamp: '2024-02-28T09:30:00Z' },
        { id: 'u3', incidentId: 'inc-1', title: 'Update 3', body: 'Body 3', timestamp: '2024-02-28T11:00:00Z' },
      ],
    }
    const stages = buildTimelineStages(incidentWithUpdates)
    expect(stages[0].updates).toHaveLength(1) // investigating
    expect(stages[1].updates).toHaveLength(1) // identified
    expect(stages[2].updates).toHaveLength(1) // monitoring
  })

  it('should assign updates to explicit status', () => {
    const incidentWithExplicitStatus: Incident = {
      ...baseIncident,
      updates: [
        { id: 'u1', incidentId: 'inc-1', title: 'Update 1', body: 'Body 1', timestamp: '2024-02-28T08:30:00Z', status: 'identified' },
      ],
    }
    const stages = buildTimelineStages(incidentWithExplicitStatus)
    expect(stages[0].updates).toHaveLength(0) // investigating
    expect(stages[1].updates).toHaveLength(1) // identified (explicit)
  })

  it('should create single stage when no status changes', () => {
    const incidentNoChanges: Incident = {
      ...baseIncident,
      statusChanges: [],
    }
    const stages = buildTimelineStages(incidentNoChanges)
    expect(stages).toHaveLength(1)
    expect(stages[0].status).toBe('resolved')
  })

  it('should handle repeated statuses', () => {
    const incidentRepeated: Incident = {
      ...baseIncident,
      statusChanges: [
        { id: 'sc1', status: 'investigating', timestamp: '2024-02-28T08:00:00Z' },
        { id: 'sc2', status: 'identified', timestamp: '2024-02-28T09:00:00Z' },
        { id: 'sc3', status: 'investigating', timestamp: '2024-02-28T09:30:00Z' },
        { id: 'sc4', status: 'resolved', timestamp: '2024-02-28T10:00:00Z' },
      ],
    }
    const stages = buildTimelineStages(incidentRepeated)
    expect(stages).toHaveLength(4)
    expect(stages[0].status).toBe('investigating')
    expect(stages[2].status).toBe('investigating')
  })
})
