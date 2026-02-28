/**
 * Escalation Rules Store
 * Manages time-based auto-escalation rules for incidents
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { IncidentStatus } from './mock-data'

const ESCALATION_RULES_FILE = join(process.cwd(), 'data', 'escalation-rules.json')
const ESCALATION_FIRES_FILE = join(process.cwd(), 'data', 'escalation-fires.json')

export type TriggerKind = 'time_since_started' | 'time_in_status'

export interface EscalationAction {
  type: 'webhook' | 'notification' | 'email'
  destinationIds: string[]
  messageTemplate?: string
}

export interface EscalationRule {
  id: string
  name: string
  description?: string
  enabled: boolean
  severityIds: string[]
  statusIn: IncidentStatus[]
  trigger: {
    kind: TriggerKind
    minutes: number
  }
  actions: EscalationAction[]
  createdAt: string
  updatedAt: string
}

export interface EscalationFire {
  id: string
  incidentId: string
  ruleId: string
  firedAt: string
  acknowledgedAt?: string
}

interface EscalationRulesStore {
  rules: EscalationRule[]
  lastUpdated: string
  version: number
}

interface EscalationFiresStore {
  fires: EscalationFire[]
  lastUpdated: string
  version: number
}

// Default escalation rules
const DEFAULT_ESCALATION_RULES: EscalationRule[] = [
  {
    id: 'esc_critical_15min',
    name: 'Critical Unresolved > 15min',
    description: 'Page on-call team when critical incident unresolved after 15 minutes',
    enabled: true,
    severityIds: ['sev_critical'],
    statusIn: ['investigating', 'identified', 'monitoring'],
    trigger: {
      kind: 'time_since_started',
      minutes: 15,
    },
    actions: [
      {
        type: 'webhook',
        destinationIds: [],
        messageTemplate: '🚨 ESCALATION: Critical incident "{{incident.title}}" has been unresolved for {{elapsedMinutes}} minutes',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'esc_high_30min',
    name: 'High Unresolved > 30min',
    description: 'Notify team when high severity incident unresolved after 30 minutes',
    enabled: true,
    severityIds: ['sev_high'],
    statusIn: ['investigating', 'identified', 'monitoring'],
    trigger: {
      kind: 'time_since_started',
      minutes: 30,
    },
    actions: [
      {
        type: 'webhook',
        destinationIds: [],
        messageTemplate: '⚠️ ESCALATION: High severity incident "{{incident.title}}" has been unresolved for {{elapsedMinutes}} minutes',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

function loadEscalationRulesFromFile(): EscalationRule[] {
  try {
    if (existsSync(ESCALATION_RULES_FILE)) {
      const data = readFileSync(ESCALATION_RULES_FILE, 'utf-8')
      const store: EscalationRulesStore = JSON.parse(data)
      return store.rules
    }
  } catch (error) {
    console.error('Failed to load escalation rules from file:', error)
  }
  return DEFAULT_ESCALATION_RULES
}

function saveEscalationRulesToFile(rules: EscalationRule[]) {
  try {
    const store: EscalationRulesStore = {
      rules,
      lastUpdated: new Date().toISOString(),
      version: 1,
    }
    writeFileSync(ESCALATION_RULES_FILE, JSON.stringify(store, null, 2))
  } catch (error) {
    console.error('Failed to save escalation rules to file:', error)
  }
}

function loadEscalationFiresFromFile(): EscalationFire[] {
  try {
    if (existsSync(ESCALATION_FIRES_FILE)) {
      const data = readFileSync(ESCALATION_FIRES_FILE, 'utf-8')
      const store: EscalationFiresStore = JSON.parse(data)
      return store.fires
    }
  } catch (error) {
    console.error('Failed to load escalation fires from file:', error)
  }
  return []
}

function saveEscalationFiresToFile(fires: EscalationFire[]) {
  try {
    const store: EscalationFiresStore = {
      fires,
      lastUpdated: new Date().toISOString(),
      version: 1,
    }
    writeFileSync(ESCALATION_FIRES_FILE, JSON.stringify(store, null, 2))
  } catch (error) {
    console.error('Failed to save escalation fires to file:', error)
  }
}

export class EscalationRuleStore {
  private rules: EscalationRule[]
  private fires: EscalationFire[]

  constructor() {
    this.rules = loadEscalationRulesFromFile()
    this.fires = loadEscalationFiresFromFile()
  }

  // Rules management
  getAll(): EscalationRule[] {
    return [...this.rules].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  getEnabled(): EscalationRule[] {
    return this.rules.filter(r => r.enabled)
  }

  getById(id: string): EscalationRule | null {
    return this.rules.find(r => r.id === id) || null
  }

  create(rule: Omit<EscalationRule, 'id' | 'createdAt' | 'updatedAt'>): EscalationRule {
    const now = new Date().toISOString()
    const newRule: EscalationRule = {
      ...rule,
      id: `esc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    }
    this.rules.push(newRule)
    saveEscalationRulesToFile(this.rules)
    return newRule
  }

  update(id: string, updates: Partial<Omit<EscalationRule, 'id' | 'createdAt'>>): EscalationRule | null {
    const index = this.rules.findIndex(r => r.id === id)
    if (index === -1) return null

    this.rules[index] = {
      ...this.rules[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    saveEscalationRulesToFile(this.rules)
    return this.rules[index]
  }

  delete(id: string): boolean {
    const index = this.rules.findIndex(r => r.id === id)
    if (index === -1) return false

    this.rules = this.rules.filter(r => r.id !== id)
    saveEscalationRulesToFile(this.rules)
    return true
  }

  toggleEnabled(id: string): EscalationRule | null {
    const rule = this.getById(id)
    if (!rule) return null
    return this.update(id, { enabled: !rule.enabled })
  }

  // Fires management (for idempotency)
  getFires(): EscalationFire[] {
    return [...this.fires]
  }

  getFiresForIncident(incidentId: string): EscalationFire[] {
    return this.fires.filter(f => f.incidentId === incidentId)
  }

  hasFired(incidentId: string, ruleId: string): boolean {
    return this.fires.some(f => f.incidentId === incidentId && f.ruleId === ruleId)
  }

  recordFire(incidentId: string, ruleId: string): EscalationFire {
    const fire: EscalationFire = {
      id: `fire_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      incidentId,
      ruleId,
      firedAt: new Date().toISOString(),
    }
    this.fires.push(fire)
    saveEscalationFiresToFile(this.fires)
    return fire
  }

  acknowledgeFire(fireId: string): EscalationFire | null {
    const fire = this.fires.find(f => f.id === fireId)
    if (!fire) return null
    fire.acknowledgedAt = new Date().toISOString()
    saveEscalationFiresToFile(this.fires)
    return fire
  }

  /**
   * Get rules that match an incident's severity
   */
  getRulesForSeverity(severityId: string): EscalationRule[] {
    return this.getEnabled().filter(rule => 
      rule.severityIds.length === 0 || rule.severityIds.includes(severityId)
    )
  }

  /**
   * Clear old fire records (for cleanup)
   */
  clearFiresOlderThan(days: number): number {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const beforeCount = this.fires.length
    this.fires = this.fires.filter(f => new Date(f.firedAt) > cutoff)
    const removed = beforeCount - this.fires.length
    if (removed > 0) {
      saveEscalationFiresToFile(this.fires)
    }
    return removed
  }
}

// Export singleton instance
export const escalationRuleStore = new EscalationRuleStore()

// Also export for API routes
export function getEscalationRuleStore() {
  return escalationRuleStore
}
