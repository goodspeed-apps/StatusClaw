import { NextResponse } from 'next/server'

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
    // Aggregate spend by model from spend data
    const spendByModel = await getModelSpendData()
    
    // Get agent counts per model
    const agentCounts = await getAgentCountsByModel()
    
    const models = KNOWN_MODELS.map(model => ({
      ...model,
      spend: spendByModel[model.id] || { day: 0, week: 0, month: 0, total: 0 },
      agentCount: agentCounts[model.id] || 0,
    })).filter(m => m.spend.total > 0 || m.agentCount > 0)

    return NextResponse.json({ models })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 })
  }
}

async function getModelSpendData(): Promise<Record<string, { day: number; week: number; month: number; total: number }>> {
  // In production, this would query OpenClaw telemetry or a metrics database
  return {
    'claude-opus-4': { day: 43.90, week: 278.60, month: 1131.00, total: 9305.20 },
    'claude-sonnet-4': { day: 25.40, week: 183.60, month: 770.50, total: 5433.50 },
    'gpt-5-mini': { day: 8.30, week: 70.30, month: 302.60, total: 2034.60 },
    'gemini-3-flash': { day: 0.00, week: 12.40, month: 56.80, total: 398.60 },
  }
}

async function getAgentCountsByModel(): Promise<Record<string, number>> {
  // Map of model -> agent count
  return {
    'claude-opus-4': 4,
    'claude-sonnet-4': 4,
    'gpt-5-mini': 3,
    'gemini-3-flash': 1,
  }
}
