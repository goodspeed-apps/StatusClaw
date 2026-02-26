// Complete spend tracking with real OpenRouter + accurate Nano Banana Pro pricing
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const SPEND_DATA_FILE = join(process.cwd(), 'data', 'spend-history.json')

// Ensure data directory exists
try {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true })
} catch {}

// Pricing constants
export const PRICING = {
  // Nano Banana Pro image generation (per image)
  'gemini-nano-banana': {
    '1K': 0.134,
    '2K': 0.139,
    '4K': 0.24,
  },
  // OpenRouter model pricing (per 1M tokens) - approximate
  'claude-opus-4': { prompt: 15.00, completion: 75.00 },
  'claude-sonnet-4': { prompt: 3.00, completion: 15.00 },
  'claude-haiku-4': { prompt: 0.25, completion: 1.25 },
  'gpt-5': { prompt: 1.50, completion: 6.00 },
  'gpt-5-mini': { prompt: 0.15, completion: 0.60 },
  'gemini-3-pro': { prompt: 1.25, completion: 5.00 },
  'gemini-3-flash': { prompt: 0.075, completion: 0.30 },
  'gemini-3-flash-lite': { prompt: 0.0375, completion: 0.15 },
}

export interface SpendRecord {
  timestamp: string
  provider: 'openrouter' | 'gemini'
  model: string
  agentId: string
  cost: number
  tokens?: {
    prompt: number
    completion: number
    total: number
  }
  metadata?: {
    resolution?: string  // For images: '1K' | '2K' | '4K'
    description?: string
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

  // Track Nano Banana Pro image generation
  trackNanoBananaImage(agentId: string, resolution: '1K' | '2K' | '4K' = '1K', description?: string) {
    const cost = PRICING['gemini-nano-banana'][resolution] || PRICING['gemini-nano-banana']['1K']
    
    this.addRecord({
      timestamp: new Date().toISOString(),
      provider: 'gemini',
      model: 'nano-banana-pro',
      agentId,
      cost,
      metadata: {
        resolution,
        description: description || 'Image generation'
      }
    })
    
    return cost
  }

  // Track OpenRouter usage
  trackOpenRouterUsage(agentId: string, model: string, promptTokens: number, completionTokens: number) {
    const pricing = PRICING[model as keyof typeof PRICING] || { prompt: 1.0, completion: 3.0 }
    
    const promptCost = (promptTokens / 1000000) * pricing.prompt
    const completionCost = (completionTokens / 1000000) * pricing.completion
    const totalCost = promptCost + completionCost
    
    this.addRecord({
      timestamp: new Date().toISOString(),
      provider: 'openrouter',
      model,
      agentId,
      cost: Math.round(totalCost * 10000) / 10000, // Round to 4 decimal places
      tokens: {
        prompt: promptTokens,
        completion: completionTokens,
        total: promptTokens + completionTokens
      }
    })
    
    return totalCost
  }

  // Calculate spend for different time periods
  getSpendByTimeframe(agentId?: string, model?: string, provider?: 'openrouter' | 'gemini'): SpendSummary {
    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    let day = 0, week = 0, month = 0, total = 0

    for (const record of this.records) {
      const recordDate = new Date(record.timestamp)
      
      // Filter by agent/model/provider if specified
      if (agentId && record.agentId !== agentId) continue
      if (model && record.model !== model) continue
      if (provider && record.provider !== provider) continue

      total += record.cost
      
      if (recordDate >= dayAgo) day += record.cost
      if (recordDate >= weekAgo) week += record.cost
      if (recordDate >= monthAgo) month += record.cost
    }

    return { 
      day: Math.round(day * 100) / 100, 
      week: Math.round(week * 100) / 100, 
      month: Math.round(month * 100) / 100, 
      total: Math.round(total * 100) / 100 
    }
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

  // Get spend breakdown by provider
  getSpendByProvider(): { openrouter: SpendSummary, gemini: SpendSummary } {
    return {
      openrouter: this.getSpendByTimeframe(undefined, undefined, 'openrouter'),
      gemini: this.getSpendByTimeframe(undefined, undefined, 'gemini'),
    }
  }
}

// Singleton instance
export const spendTracker = new SpendTracker()

// Fetch OpenRouter key usage
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

// Get aggregated spend data for dashboard
export async function getAggregatedSpendData(openRouterKey?: string): Promise<{
  byAgent: Record<string, SpendSummary>
  byModel: Record<string, SpendSummary>
  byProvider: { openrouter: SpendSummary, gemini: SpendSummary }
  overall: SpendSummary
  openRouterRealData?: {
    daily: number
    weekly: number
    monthly: number
  }
}> {
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

  // Try to fetch real OpenRouter data
  let openRouterRealData = undefined
  if (openRouterKey) {
    const result = await fetchOpenRouterKeyUsage(openRouterKey)
    if (result.success && result.usage) {
      openRouterRealData = {
        daily: result.usage.daily,
        weekly: result.usage.weekly,
        monthly: result.usage.monthly,
      }
    }
  }

  return {
    byAgent,
    byModel,
    byProvider: spendTracker.getSpendByProvider(),
    overall: spendTracker.getSpendByTimeframe(),
    openRouterRealData,
  }
}