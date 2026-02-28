/**
 * Severity Levels Store
 * Manages configurable severity levels for incidents
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const SEVERITY_LEVELS_FILE = join(process.cwd(), 'data', 'severity-levels.json')

export interface SeverityLevel {
  id: string
  name: string
  slug: string
  color: string
  icon: string
  order: number
  pagesOnCall: boolean
  isDefault: boolean
  description?: string
}

interface SeverityLevelsStore {
  levels: SeverityLevel[]
  lastUpdated: string
  version: number
}

// Default severity levels
const DEFAULT_SEVERITY_LEVELS: SeverityLevel[] = [
  {
    id: 'sev_critical',
    name: 'Critical',
    slug: 'critical',
    color: '#ef4444',
    icon: 'alert-octagon',
    order: 0,
    pagesOnCall: true,
    isDefault: false,
    description: 'Complete service outage or major functionality unavailable',
  },
  {
    id: 'sev_high',
    name: 'High',
    slug: 'high',
    color: '#f97316',
    icon: 'alert-triangle',
    order: 1,
    pagesOnCall: false,
    isDefault: true,
    description: 'Significant functionality degraded or partially unavailable',
  },
  {
    id: 'sev_medium',
    name: 'Medium',
    slug: 'medium',
    color: '#eab308',
    icon: 'alert-circle',
    order: 2,
    pagesOnCall: false,
    isDefault: false,
    description: 'Minor functionality impacted or workarounds available',
  },
  {
    id: 'sev_low',
    name: 'Low',
    slug: 'low',
    color: '#22c55e',
    icon: 'info',
    order: 3,
    pagesOnCall: false,
    isDefault: false,
    description: 'Cosmetic issues or minor inconveniences',
  },
]

function loadSeverityLevelsFromFile(): SeverityLevel[] {
  try {
    if (existsSync(SEVERITY_LEVELS_FILE)) {
      const data = readFileSync(SEVERITY_LEVELS_FILE, 'utf-8')
      const store: SeverityLevelsStore = JSON.parse(data)
      return store.levels
    }
  } catch (error) {
    console.error('Failed to load severity levels from file:', error)
  }
  return DEFAULT_SEVERITY_LEVELS
}

function saveSeverityLevelsToFile(levels: SeverityLevel[]) {
  try {
    const store: SeverityLevelsStore = {
      levels,
      lastUpdated: new Date().toISOString(),
      version: 1,
    }
    writeFileSync(SEVERITY_LEVELS_FILE, JSON.stringify(store, null, 2))
  } catch (error) {
    console.error('Failed to save severity levels to file:', error)
  }
}

export class SeverityLevelStore {
  private levels: SeverityLevel[]

  constructor() {
    this.levels = loadSeverityLevelsFromFile()
  }

  getAll(): SeverityLevel[] {
    return [...this.levels].sort((a, b) => a.order - b.order)
  }

  getById(id: string): SeverityLevel | null {
    return this.levels.find(l => l.id === id) || null
  }

  getBySlug(slug: string): SeverityLevel | null {
    return this.levels.find(l => l.slug === slug) || null
  }

  getDefault(): SeverityLevel | null {
    return this.levels.find(l => l.isDefault) || this.levels[0] || null
  }

  create(level: Omit<SeverityLevel, 'id'>): SeverityLevel {
    // Check for slug uniqueness
    if (this.levels.some(l => l.slug === level.slug)) {
      throw new Error(`Severity level with slug '${level.slug}' already exists`)
    }

    // If this is marked as default, clear other defaults
    if (level.isDefault) {
      this.levels = this.levels.map(l => ({ ...l, isDefault: false }))
    }

    const newLevel: SeverityLevel = {
      ...level,
      id: `sev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }
    this.levels.push(newLevel)
    saveSeverityLevelsToFile(this.levels)
    return newLevel
  }

  update(id: string, updates: Partial<SeverityLevel>): SeverityLevel | null {
    const index = this.levels.findIndex(l => l.id === id)
    if (index === -1) return null

    // Check for slug uniqueness if slug is being updated
    if (updates.slug && updates.slug !== this.levels[index].slug) {
      if (this.levels.some(l => l.slug === updates.slug && l.id !== id)) {
        throw new Error(`Severity level with slug '${updates.slug}' already exists`)
      }
    }

    // If this is being marked as default, clear other defaults
    if (updates.isDefault && !this.levels[index].isDefault) {
      this.levels = this.levels.map(l => ({ ...l, isDefault: false }))
    }

    this.levels[index] = { ...this.levels[index], ...updates }
    saveSeverityLevelsToFile(this.levels)
    return this.levels[index]
  }

  delete(id: string): boolean {
    const level = this.levels.find(l => l.id === id)
    if (!level) return false

    // Don't allow deleting the default level
    if (level.isDefault) {
      throw new Error('Cannot delete the default severity level')
    }

    this.levels = this.levels.filter(l => l.id !== id)
    saveSeverityLevelsToFile(this.levels)
    return true
  }

  reorder(orderedIds: string[]): SeverityLevel[] {
    const idSet = new Set(orderedIds)
    const currentIds = new Set(this.levels.map(l => l.id))

    // Validate all IDs exist
    for (const id of orderedIds) {
      if (!currentIds.has(id)) {
        throw new Error(`Severity level with id '${id}' not found`)
      }
    }

    // Update order based on provided array
    this.levels = this.levels.map(level => ({
      ...level,
      order: orderedIds.indexOf(level.id),
    }))

    saveSeverityLevelsToFile(this.levels)
    return this.getAll()
  }

  /**
   * Get severity config for display (colors, icons)
   */
  getSeverityConfig(): Record<string, { label: string; color: string; icon: string; bgColor: string }> {
    return this.levels.reduce((acc, level) => {
      acc[level.slug] = {
        label: level.name,
        color: level.color,
        icon: level.icon,
        bgColor: `${level.color}20`, // 20% opacity hex
      }
      return acc
    }, {} as Record<string, { label: string; color: string; icon: string; bgColor: string }>)
  }
}

// Export singleton instance
export const severityLevelStore = new SeverityLevelStore()

// Also export for API routes
export function getSeverityLevelStore() {
  return severityLevelStore
}
