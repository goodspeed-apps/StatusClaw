import { describe, it, expect, beforeEach } from 'vitest'
import { SeverityLevelStore } from './severity-level-store'
import { EscalationRuleStore } from './escalation-rule-store'
import { evaluateIncident, evaluateAllIncidents, getPendingEscalations, formatEscalationMessage } from './escalation-engine'
import type { Incident, IncidentStatus } from './mock-data'

describe('SeverityLevelStore', () => {
  let store: SeverityLevelStore

  beforeEach(() => {
    store = new SeverityLevelStore()
    // Note: Store loads defaults from file or uses built-in defaults
  })

  it('should have default severity levels', () => {
    const levels = store.getAll()
    expect(levels.length).toBeGreaterThan(0)
    expect(levels.some(l => l.slug === 'critical')).toBe(true)
    expect(levels.some(l => l.slug === 'high')).toBe(true)
    expect(levels.some(l => l.slug === 'medium')).toBe(true)
    expect(levels.some(l => l.slug === 'low')).toBe(true)
  })

  it('should create a new severity level', () => {
    const level = store.create({
      name: 'Urgent',
      slug: 'urgent',
      color: '#ff0000',
      icon: 'alert-circle',
      order: 10,
      pagesOnCall: true,
      isDefault: false,
    })

    expect(level.id).toBeDefined()
    expect(level.name).toBe('Urgent')
    expect(level.slug).toBe('urgent')
    expect(store.getById(level.id)).toEqual(level)
  })

  it('should not allow duplicate slugs', () => {
    store.create({
      name: 'Test',
      slug: 'test',
      color: '#ff0000',
      icon: 'alert-circle',
      order: 10,
      pagesOnCall: false,
      isDefault: false,
    })

    expect(() => store.create({
      name: 'Test 2',
      slug: 'test',
      color: '#00ff00',
      icon: 'alert-circle',
      order: 11,
      pagesOnCall: false,
      isDefault: false,
    })).toThrow("Severity level with slug 'test' already exists")
  })

  it('should update a severity level', () => {
    const level = store.create({
      name: 'Test',
      slug: 'test',
      color: '#ff0000',
      icon: 'alert-circle',
      order: 10,
      pagesOnCall: false,
      isDefault: false,
    })

    const updated = store.update(level.id, { name: 'Updated Test', color: '#00ff00' })
    expect(updated?.name).toBe('Updated Test')
    expect(updated?.color).toBe('#00ff00')
  })

  it('should set only one default level', () => {
    const level1 = store.create({
      name: 'Test 1',
      slug: 'test1',
      color: '#ff0000',
      icon: 'alert-circle',
      order: 10,
      pagesOnCall: false,
      isDefault: true,
    })

    const level2 = store.create({
      name: 'Test 2',
      slug: 'test2',
      color: '#00ff00',
      icon: 'alert-circle',
      order: 11,
      pagesOnCall: false,
      isDefault: true,
    })

    expect(store.getById(level1.id)?.isDefault).toBe(false)
    expect(store.getById(level2.id)?.isDefault).toBe(true)
  })

  it('should delete a severity level', () => {
    const level = store.create({
      name: 'Test',
      slug: 'test-delete',
      color: '#ff0000',
      icon: 'alert-circle',
      order: 10,
      pagesOnCall: false,
      isDefault: false,
    })

    const result = store.delete(level.id)
    expect(result).toBe(true)
    expect(store.getById(level.id)).toBeNull()
  })

  it('should not delete the default level', () => {
    const defaultLevel = store.getDefault()
    if (defaultLevel) {
      expect(() => store.delete(defaultLevel.id)).toThrow('Cannot delete the default severity level')
    }
  })

  it('should reorder severity levels', () => {
    const level1 = store.create({
      name: 'First',
      slug: 'first',
      color: '#ff0000',
      icon: 'alert-circle',
      order: 0,
      pagesOnCall: false,
      isDefault: false,
    })

    const level2 = store.create({
      name: 'Second',
      slug: 'second',
      color: '#00ff00',
      icon: 'alert-circle',
      order: 1,
      pagesOnCall: false,
      isDefault: false,
    })

    store.reorder([level2.id, level1.id])

    expect(store.getById(level2.id)?.order).toBe(0)
    expect(store.getById(level1.id)?.order).toBe(1)
  })
})

describe('EscalationRuleStore', () => {
  let store: EscalationRuleStore

  beforeEach(() => {
    store = new EscalationRuleStore()
    // Clear all rules
    store.getAll().forEach(rule => store.delete(rule.id))
  })

  it('should create an escalation rule', () => {
    const rule = store.create({
      name: 'Test Rule',
      description: 'Test description',
      enabled: true,
      severityIds: ['sev_critical'],
      statusIn: ['investigating', 'identified'],
      trigger: { kind: 'time_since_started', minutes: 15 },
      actions: [{ type: 'webhook', destinationIds: ['webhook_1'] }],
    })

    expect(rule.id).toBeDefined()
    expect(rule.name).toBe('Test Rule')
    expect(store.getById(rule.id)).toEqual(rule)
  })

  it('should update an escalation rule', () => {
    const rule = store.create({
      name: 'Test Rule',
      description: 'Test description',
      enabled: true,
      severityIds: [],
      statusIn: ['investigating'],
      trigger: { kind: 'time_since_started', minutes: 15 },
      actions: [],
    })

    const updated = store.update(rule.id, { name: 'Updated Rule', enabled: false })
    expect(updated?.name).toBe('Updated Rule')
    expect(updated?.enabled).toBe(false)
  })

  it('should delete an escalation rule', () => {
    const rule = store.create({
      name: 'Test Rule',
      description: 'Test description',
      enabled: true,
      severityIds: [],
      statusIn: ['investigating'],
      trigger: { kind: 'time_since_started', minutes: 15 },
      actions: [],
    })

    const result = store.delete(rule.id)
    expect(result).toBe(true)
    expect(store.getById(rule.id)).toBeNull()
  })

  it('should toggle rule enabled status', () => {
    const rule = store.create({
      name: 'Test Rule',
      description: 'Test description',
      enabled: true,
      severityIds: [],
      statusIn: ['investigating'],
      trigger: { kind: 'time_since_started', minutes: 15 },
      actions: [],
    })

    store.toggleEnabled(rule.id)
    expect(store.getById(rule.id)?.enabled).toBe(false)

    store.toggleEnabled(rule.id)
    expect(store.getById(rule.id)?.enabled).toBe(true)
  })

  it('should get enabled rules only', () => {
    store.create({
      name: 'Enabled Rule',
      description: 'Test',
      enabled: true,
      severityIds: [],
      statusIn: ['investigating'],
      trigger: { kind: 'time_since_started', minutes: 15 },
      actions: [],
    })

    store.create({
      name: 'Disabled Rule',
      description: 'Test',
      enabled: false,
      severityIds: [],
      statusIn: ['investigating'],
      trigger: { kind: 'time_since_started', minutes: 15 },
      actions: [],
    })

    const enabledRules = store.getEnabled()
    expect(enabledRules.length).toBe(1)
    expect(enabledRules[0].name).toBe('Enabled Rule')
  })

  it('should record and check escalation fires', () => {
    const rule = store.create({
      name: 'Test Rule',
      description: 'Test',
      enabled: true,
      severityIds: [],
      statusIn: ['investigating'],
      trigger: { kind: 'time_since_started', minutes: 15 },
      actions: [],
    })

    const incidentId = 'inc_123'

    expect(store.hasFired(incidentId, rule.id)).toBe(false)

    const fire = store.recordFire(incidentId, rule.id)
    expect(fire.incidentId).toBe(incidentId)
    expect(fire.ruleId).toBe(rule.id)
    expect(store.hasFired(incidentId, rule.id)).toBe(true)

    const fires = store.getFiresForIncident(incidentId)
    expect(fires.length).toBe(1)
    expect(fires[0].id).toBe(fire.id)
  })

  it('should acknowledge escalation fires', () => {
    const rule = store.create({
      name: 'Test Rule',
      description: 'Test',
      enabled: true,
      severityIds: [],
      statusIn: ['investigating'],
      trigger: { kind: 'time_since_started', minutes: 15 },
      actions: [],
    })

    const fire = store.recordFire('inc_123', rule.id)
    expect(fire.acknowledgedAt).toBeUndefined()

    const acknowledged = store.acknowledgeFire(fire.id)
    expect(acknowledged?.acknowledgedAt).toBeDefined()
  })

  it('should get rules for specific severity', () => {
    store.create({
      name: 'Critical Rule',
      description: 'Test',
      enabled: true,
      severityIds: ['sev_critical'],
      statusIn: ['investigating'],
      trigger: { kind: 'time_since_started', minutes: 15 },
      actions: [],
    })

    store.create({
      name: 'All Rule',
      description: 'Test',
      enabled: true,
      severityIds: [],
      statusIn: ['investigating'],
      trigger: { kind: 'time_since_started', minutes: 15 },
      actions: [],
    })

    const criticalRules = store.getRulesForSeverity('sev_critical')
    expect(criticalRules.length).toBe(2) // Both rules apply

    const highRules = store.getRulesForSeverity('sev_high')
    expect(highRules.length).toBe(1) // Only the "All" rule applies
  })
})

describe('EscalationEngine', () => {
  let ruleStore: EscalationRuleStore
  let severityStore: SeverityLevelStore

  beforeEach(() => {
    ruleStore = new EscalationRuleStore()
    severityStore = new SeverityLevelStore()
    // Clear rules
    ruleStore.getAll().forEach(rule => ruleStore.delete(rule.id))
  })

  const createIncident = (overrides: Partial<Incident> = {}): Incident => ({
    id: `inc_${Date.now()}`,
    title: 'Test Incident',
    description: 'Test',
    service: 'API',
    severity: 'critical',
    status: 'investigating',
    startedAt: new Date().toISOString(),
    updates: [],
    ...overrides,
  })

  it('should trigger escalation when time threshold is exceeded', () => {
    const severity = severityStore.getBySlug('critical')
    if (!severity) return

    ruleStore.create({
      name: 'Critical 15min Rule',
      description: 'Test',
      enabled: true,
      severityIds: [severity.id],
      statusIn: ['investigating', 'identified', 'monitoring'],
      trigger: { kind: 'time_since_started', minutes: 15 },
      actions: [{ type: 'webhook', destinationIds: [] }],
    })

    // Create incident that started 20 minutes ago
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString()
    const incident = createIncident({ 
      severity: 'critical',
      startedAt: twentyMinutesAgo,
    })

    const results = evaluateIncident(incident)
    expect(results.length).toBeGreaterThan(0)
    expect(results.some(r => r.triggered)).toBe(true)
  })

  it('should not trigger escalation when time threshold is not met', () => {
    const severity = severityStore.getBySlug('critical')
    if (!severity) return

    ruleStore.create({
      name: 'Critical 60min Rule',
      description: 'Test',
      enabled: true,
      severityIds: [severity.id],
      statusIn: ['investigating'],
      trigger: { kind: 'time_since_started', minutes: 60 },
      actions: [{ type: 'webhook', destinationIds: [] }],
    })

    // Create incident that started 5 minutes ago
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const incident = createIncident({ 
      severity: 'critical',
      startedAt: fiveMinutesAgo,
    })

    const results = evaluateIncident(incident)
    expect(results.some(r => r.triggered)).toBe(false)
  })

  it('should not trigger escalation for resolved incidents', () => {
    const severity = severityStore.getBySlug('critical')
    if (!severity) return

    ruleStore.create({
      name: 'Critical 1min Rule',
      description: 'Test',
      enabled: true,
      severityIds: [severity.id],
      statusIn: ['investigating'],
      trigger: { kind: 'time_since_started', minutes: 1 },
      actions: [{ type: 'webhook', destinationIds: [] }],
    })

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const incident = createIncident({ 
      severity: 'critical',
      status: 'resolved',
      startedAt: fiveMinutesAgo,
      resolvedAt: new Date().toISOString(),
    })

    const results = evaluateIncident(incident)
    expect(results.length).toBe(0)
  })

  it('should not trigger escalation twice for the same incident', () => {
    const severity = severityStore.getBySlug('critical')
    if (!severity) return

    const rule = ruleStore.create({
      name: 'Critical 1min Rule',
      description: 'Test',
      enabled: true,
      severityIds: [severity.id],
      statusIn: ['investigating'],
      trigger: { kind: 'time_since_started', minutes: 1 },
      actions: [{ type: 'webhook', destinationIds: [] }],
    })

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const incident = createIncident({ 
      severity: 'critical',
      startedAt: fiveMinutesAgo,
    })

    // First evaluation should trigger
    const results1 = evaluateIncident(incident)
    expect(results1.filter(r => r.triggered).length).toBe(1)

    // Second evaluation should not trigger (already fired)
    const results2 = evaluateIncident(incident)
    expect(results2.some(r => r.triggered)).toBe(false)
  })

  it('should get pending escalations', () => {
    const severity = severityStore.getBySlug('critical')
    if (!severity) return

    ruleStore.create({
      name: 'Critical 30min Rule',
      description: 'Test',
      enabled: true,
      severityIds: [severity.id],
      statusIn: ['investigating'],
      trigger: { kind: 'time_since_started', minutes: 30 },
      actions: [{ type: 'webhook', destinationIds: [] }],
    })

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const incident = createIncident({ 
      severity: 'critical',
      startedAt: tenMinutesAgo,
    })

    const pending = getPendingEscalations(incident)
    expect(pending.length).toBeGreaterThan(0)
    expect(pending[0].minutesRemaining).toBeGreaterThan(0)
    expect(pending[0].minutesRemaining).toBeLessThan(30)
  })

  it('should format escalation messages correctly', () => {
    const incident = createIncident({
      title: 'API Outage',
      service: 'API',
      severity: 'critical',
      status: 'investigating',
    })

    const template = '🚨 {{incident.title}} ({{incident.service}}) - {{elapsedMinutes}}min'
    const message = formatEscalationMessage(template, incident, 15)

    expect(message).toBe('🚨 API Outage (API) - 15min')
  })
})
