import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { severityLevelStore } from '@/lib/severity-level-store'
import { escalationRuleStore } from '@/lib/escalation-rule-store'

const API_BASE = 'http://localhost:3000'

describe('Severity Levels API', () => {
  // Note: These tests require the dev server to be running
  // Run with: pnpm dev &
  // Then: pnpm test

  beforeAll(async () => {
    // Reset to defaults
    const levels = severityLevelStore.getAll()
    levels.forEach(level => {
      if (!level.isDefault) {
        try {
          severityLevelStore.delete(level.id)
        } catch {
          // Ignore delete errors for default levels
        }
      }
    })
  })

  it('should GET all severity levels', async () => {
    const response = await fetch(`${API_BASE}/api/severity-levels`)
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.levels).toBeDefined()
    expect(Array.isArray(data.levels)).toBe(true)
    expect(data.count).toBeGreaterThan(0)
  })

  it('should POST a new severity level', async () => {
    const newLevel = {
      name: 'Test Severity',
      slug: `test-severity-${Date.now()}`,
      color: '#ff5733',
      icon: 'alert-circle',
      order: 99,
      pagesOnCall: false,
      isDefault: false,
    }

    const response = await fetch(`${API_BASE}/api/severity-levels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLevel),
    })

    expect(response.status).toBe(201)
    
    const data = await response.json()
    expect(data.level).toBeDefined()
    expect(data.level.name).toBe(newLevel.name)
    expect(data.level.id).toBeDefined()
  })

  it('should reject POST with missing required fields', async () => {
    const incompleteLevel = {
      name: 'Incomplete',
      // Missing slug and color
    }

    const response = await fetch(`${API_BASE}/api/severity-levels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(incompleteLevel),
    })

    expect(response.status).toBe(400)
  })

  it('should PATCH an existing severity level', async () => {
    // First create a level
    const createResponse = await fetch(`${API_BASE}/api/severity-levels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Patch Test',
        slug: `patch-test-${Date.now()}`,
        color: '#000000',
        icon: 'alert-circle',
        order: 100,
        pagesOnCall: false,
        isDefault: false,
      }),
    })

    const { level: createdLevel } = await createResponse.json()

    // Then update it
    const updateResponse = await fetch(`${API_BASE}/api/severity-levels/${createdLevel.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name', color: '#ffffff' }),
    })

    expect(updateResponse.status).toBe(200)
    
    const { level: updatedLevel } = await updateResponse.json()
    expect(updatedLevel.name).toBe('Updated Name')
    expect(updatedLevel.color).toBe('#ffffff')
  })

  it('should return 404 for non-existent severity level', async () => {
    const response = await fetch(`${API_BASE}/api/severity-levels/non-existent-id`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    })

    expect(response.status).toBe(404)
  })
})

describe('Escalation Rules API', () => {
  beforeAll(async () => {
    // Clear all rules
    const rules = escalationRuleStore.getAll()
    rules.forEach(rule => escalationRuleStore.delete(rule.id))
  })

  it('should GET all escalation rules', async () => {
    const response = await fetch(`${API_BASE}/api/escalation-rules`)
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.rules).toBeDefined()
    expect(Array.isArray(data.rules)).toBe(true)
  })

  it('should POST a new escalation rule', async () => {
    const newRule = {
      name: 'Test Escalation Rule',
      description: 'Test rule for integration tests',
      enabled: true,
      severityIds: [],
      statusIn: ['investigating', 'identified'],
      trigger: {
        kind: 'time_since_started' as const,
        minutes: 30,
      },
      actions: [
        {
          type: 'webhook' as const,
          destinationIds: ['webhook_1'],
          messageTemplate: 'Test: {{incident.title}}',
        },
      ],
    }

    const response = await fetch(`${API_BASE}/api/escalation-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRule),
    })

    expect(response.status).toBe(201)
    
    const data = await response.json()
    expect(data.rule).toBeDefined()
    expect(data.rule.name).toBe(newRule.name)
    expect(data.rule.id).toBeDefined()
    expect(data.rule.enabled).toBe(true)
  })

  it('should reject POST with invalid trigger', async () => {
    const invalidRule = {
      name: 'Invalid Rule',
      trigger: {
        kind: 'time_since_started',
        // Missing minutes
      },
      actions: [],
    }

    const response = await fetch(`${API_BASE}/api/escalation-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidRule),
    })

    expect(response.status).toBe(400)
  })

  it('should PATCH to toggle rule enabled status', async () => {
    // First create a rule
    const createResponse = await fetch(`${API_BASE}/api/escalation-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Toggle Test Rule',
        enabled: true,
        severityIds: [],
        statusIn: ['investigating'],
        trigger: { kind: 'time_since_started', minutes: 15 },
        actions: [],
      }),
    })

    const { rule: createdRule } = await createResponse.json()
    expect(createdRule.enabled).toBe(true)

    // Toggle off
    const toggleResponse = await fetch(`${API_BASE}/api/escalation-rules/${createdRule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    })

    expect(toggleResponse.status).toBe(200)
    
    const { rule: toggledRule } = await toggleResponse.json()
    expect(toggledRule.enabled).toBe(false)
  })

  it('should DELETE an escalation rule', async () => {
    // First create a rule
    const createResponse = await fetch(`${API_BASE}/api/escalation-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Delete Test Rule',
        enabled: true,
        severityIds: [],
        statusIn: ['investigating'],
        trigger: { kind: 'time_since_started', minutes: 15 },
        actions: [],
      }),
    })

    const { rule: createdRule } = await createResponse.json()

    // Delete it
    const deleteResponse = await fetch(`${API_BASE}/api/escalation-rules/${createdRule.id}`, {
      method: 'DELETE',
    })

    expect(deleteResponse.status).toBe(200)

    // Verify it's gone
    const getResponse = await fetch(`${API_BASE}/api/escalation-rules/${createdRule.id}`)
    expect(getResponse.status).toBe(404)
  })
})

describe('Escalation Process API', () => {
  it('should POST to process escalations', async () => {
    const response = await fetch(`${API_BASE}/api/escalations/process`, {
      method: 'POST',
    })

    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.processed).toBeDefined()
    expect(data.triggered).toBeDefined()
    expect(data.timestamp).toBeDefined()
    expect(Array.isArray(data.results)).toBe(true)
  })

  it('should require auth token if configured', async () => {
    // This test assumes ESCALATION_PROCESS_TOKEN is set
    // If not set, the endpoint should still work without auth
    const originalToken = process.env.ESCALATION_PROCESS_TOKEN
    process.env.ESCALATION_PROCESS_TOKEN = 'test-secret-token'

    try {
      // Without token
      const noAuthResponse = await fetch(`${API_BASE}/api/escalations/process`, {
        method: 'POST',
      })
      expect(noAuthResponse.status).toBe(401)

      // With token
      const authResponse = await fetch(`${API_BASE}/api/escalations/process`, {
        method: 'POST',
        headers: { authorization: 'Bearer test-secret-token' },
      })
      expect(authResponse.status).toBe(200)
    } finally {
      process.env.ESCALATION_PROCESS_TOKEN = originalToken
    }
  })
})

describe('Escalation Fires API', () => {
  it('should GET escalation fires', async () => {
    const response = await fetch(`${API_BASE}/api/escalation-fires`)
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.fires).toBeDefined()
    expect(Array.isArray(data.fires)).toBe(true)
  })

  it('should GET escalation fires filtered by incident', async () => {
    const incidentId = 'test-incident-id'
    const response = await fetch(`${API_BASE}/api/escalation-fires?incidentId=${incidentId}`)
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.fires).toBeDefined()
    expect(Array.isArray(data.fires)).toBe(true)
  })
})
