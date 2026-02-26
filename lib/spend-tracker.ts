// Real-time spend tracking from OpenRouter and Gemini APIs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const SPEND_DATA_FILE = join(process.cwd(), 'data', 'spend-history.json')

// Ensure data directory exists
try {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true })
} catch {}

export interface SpendRecord {
  timestamp: string
  provider: 'openrouter' | 'gemini'
  model: string
  agentId: string
  cost: number
  tokens: {
    prompt: number
    completion: number
    total: number
  }
}

export interface SpendSummary {
  day: number
  week: number
  month: number
  total: number
}

class SpendTracker {
  private records: SpendRecord[] = []
  
  constructor() {
    this.loadFromFile()
  }

  private loadFromFile() {
    try {
      if (existsSync(SPEND_DATA_FILE)) {
        const data = readFileSync(SPEND_DATA_FILE, 'utf-8')
        this.records = JSON.parse(data)
      }
    } catch (error) {
      console.error('[SpendTracker] Failed to load spend data:', error)
      this.records = []
    }
  }

  private saveToFile() {
    try {
      writeFileSync(SPEND_DATA_FILE, JSON.stringify(this.records, null, 2))
    } catch (error) {
      console.error('[SpendTracker] Failed to save spend data:', error)
    }
  }

  addRecord(record: SpendRecord) {
    this.records.push(record)
    this.saveToFile()
  }

  // Calculate spend for different time periods
  getSpendByTimeframe(agentId?: string, model?: string): SpendSummary {
    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    let day = 0, week = 0, month = 0, total = 0

    for (const record of this.records) {
      const recordDate = new Date(record.timestamp)
      
      // Filter by agent/model if specified
      if (agentId && record.agentId !== agentId) continue
      if (model && record.model !== model) continue

      total += record.cost
      
      if (recordDate >= dayAgo) day += record.cost
      if (recordDate >= weekAgo) week += record.cost
      if (recordDate >= monthAgo) month += record.cost
    }

    return { day: Math.round(day * 100) / 100, week: Math.round(week * 100) / 100, month: Math.round(month * 100) / 100, total: Math.round(total * 100) / 100 }
  }

  getAllRecords(): SpendRecord[] {
    return [...this.records]
  }

  getModelsUsed(): string[] {
    const models = new Set(this.records.map(r => r.model))
    return Array.from(models)
  }

  getAgentsWithSpend(): string[] {
    const agents = new Set(this.records.map(r => r.agentId))
    return Array.from(agents)
  }
}

// Singleton instance
export const spendTracker = new SpendTracker()

// Fetch OpenRouter spend data
export async function fetchOpenRouterCredits(apiKey: string): Promise<{
  success: boolean
  credits?: {
    remaining: number
    used: number
    total: number
  }
  error?: string
}> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/credits', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error: `OpenRouter API error: ${response.status} - ${error}` }
    }

    const data = await response.json()
    
    return {
      success: true,
      credits: {
        remaining: data.data?.credits_remaining || 0,
        used: data.data?.credits_used || 0,
        total: (data.data?.credits_remaining || 0) + (data.data?.credits_used || 0),
      }
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Fetch OpenRouter key usage (more detailed)
export async function fetchOpenRouterKeyUsage(apiKey: string): Promise<{
  success: boolean
  usage?: {
    limit: number | null
    remaining: number
    daily: number
    weekly: number
    monthly: number
  }
  error?: string
}> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/key', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error: `OpenRouter API error: ${response.status} - ${error}` }
    }

    const data = await response.json()
    
    return {
      success: true,
      usage: {
        limit: data.data?.limit || null,
        remaining: data.data?.limit_remaining || 0,
        daily: data.data?.usage?.daily || 0,
        weekly: data.data?.usage?.weekly || 0,
        monthly: data.data?.usage?.monthly || 0,
      }
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get aggregated spend data for all agents
export function getAggregatedSpendData(): {
  byAgent: Record<string, SpendSummary>
  byModel: Record<string, SpendSummary>
  overall: SpendSummary
} {
  const agents = spendTracker.getAgentsWithSpend()
  const models = spendTracker.getModelsUsed()

  const byAgent: Record<string, SpendSummary> = {}
  const byModel: Record<string, SpendSummary> = {}

  for (const agent of agents) {
    byAgent[agent] = spendTracker.getSpendByTimeframe(agent)
  }

  for (const model of models) {
    byModel[model] = spendTracker.getSpendByTimeframe(undefined, model)
  }

  return {
    byAgent,
    byModel,
    overall: spendTracker.getSpendByTimeframe(),
  }
}