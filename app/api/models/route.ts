import { NextResponse } from 'next/server'
import { spendTracker, getAggregatedSpendData } from '@/lib/spend-tracker'

export const dynamic = 'force-dynamic'

// Known models in use
const KNOWN_MODELS = [
  { id: 'claude-opus-4', name: 'Claude Opus 4', provider: 'Anthropic', avatar: '/models/anthropic.jpg' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic', avatar: '/models/anthropic.jpg' },
  { id: 'gpt-5', name: 'GPT-5', provider: 'OpenAI', avatar: '/models/openai.jpg' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'OpenAI', avatar: '/models/openai.jpg' },
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash', provider: 'Google', avatar: '/models/google.jpg' },
  { id: 'gemini-3-pro', name: 'Gemini 3 Pro', provider: 'Google', avatar: '/models/google.jpg' },
]

export async function GET() {
  try {
    // Get real spend data from spend tracker
    const aggregated = await getAggregatedSpendData()
    const spendByModel = aggregated.byModel
    
    // Get agent counts per model from actual records
    const agentCounts = getAgentCountsByModel()
    
    const models = KNOWN_MODELS.map(model => ({
      ...model,
      spend: spendByModel[model.id] || { day: 0, week: 0, month: 0, total: 0 },
      agentCount: agentCounts[model.id] || 0,
    })).filter(m => m.spend.total > 0 || m.agentCount > 0)

    return NextResponse.json({ 
      models,
      usingRealData: Object.keys(spendByModel).length > 0
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 })
  }
}

function getAgentCountsByModel(): Record<string, number> {
  // Count unique agents per model from spend records
  const records = spendTracker.getAllRecords()
  const modelAgents: Record<string, Set<string>> = {}
  
  for (const record of records) {
    if (!modelAgents[record.model]) {
      modelAgents[record.model] = new Set()
    }
    modelAgents[record.model].add(record.agentId)
  }
  
  // Convert sets to counts
  const counts: Record<string, number> = {}
  for (const [model, agents] of Object.entries(modelAgents)) {
    counts[model] = agents.size
  }
  
  return counts
}
