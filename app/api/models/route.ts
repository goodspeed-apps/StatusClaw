import { NextResponse } from 'next/server'
import { getAggregatedSpendData, PRICING } from '@/lib/spend-tracker'

export const dynamic = 'force-dynamic'

// Known models in use with their metadata
const KNOWN_MODELS = [
  { id: 'claude-opus-4', name: 'Claude Opus 4', provider: 'Anthropic', avatar: '/models/anthropic.jpg' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic', avatar: '/models/anthropic.jpg' },
  { id: 'claude-haiku-4', name: 'Claude Haiku 4', provider: 'Anthropic', avatar: '/models/anthropic.jpg' },
  { id: 'gpt-5', name: 'GPT-5', provider: 'OpenAI', avatar: '/models/openai.jpg' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'OpenAI', avatar: '/models/openai.jpg' },
  { id: 'gemini-3-pro', name: 'Gemini 3 Pro', provider: 'Google', avatar: '/models/google.jpg' },
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash', provider: 'Google', avatar: '/models/google.jpg' },
  { id: 'gemini-3-flash-lite', name: 'Gemini 3 Flash Lite', provider: 'Google', avatar: '/models/google.jpg' },
  { id: 'nano-banana-pro', name: 'Nano Banana Pro', provider: 'Gemini', avatar: '/models/google.jpg', isImageModel: true },
]

// Agent metadata from agents/route.ts
const AGENT_METADATA: Record<string, { model: string }> = {
  atlas: { model: 'claude-opus-4' },
  architect: { model: 'claude-opus-4' },
  backend_eng: { model: 'claude-sonnet-4' },
  cfo: { model: 'gpt-5-mini' },
  cmo: { model: 'claude-sonnet-4' },
  cto: { model: 'claude-opus-4' },
  pm: { model: 'gpt-5-mini' },
  mobile_eng: { model: 'claude-sonnet-4' },
  revenue_ops: { model: 'gpt-5-mini' },
  security: { model: 'claude-opus-4' },
  side_hustle_studio: { model: 'gemini-3-flash' },
  web_eng: { model: 'claude-sonnet-4' },
}

export async function GET() {
  try {
    const openRouterKey = process.env.OPENROUTER_API_KEY
    
    // Get real spend data from tracker
    const aggregated = await getAggregatedSpendData(openRouterKey)
    
    // Get agent counts per model
    const agentCounts = getAgentCountsByModel()
    
    // Build models list with real spend data
    const models = KNOWN_MODELS.map(model => {
      const spend = aggregated.byModel[model.id] || { day: 0, week: 0, month: 0, total: 0 }
      const pricing = PRICING[model.id as keyof typeof PRICING]
      
      return {
        ...model,
        spend,
        agentCount: agentCounts[model.id] || 0,
        pricing: pricing ? {
          prompt: pricing.prompt,
          completion: pricing.completion,
        } : undefined,
      }
    }).filter(m => m.spend.total > 0 || m.agentCount > 0)
    
    // Add Nano Banana Pro if it has spend but isn't in models yet
    if (aggregated.byModel['nano-banana-pro'] && !models.find(m => m.id === 'nano-banana-pro')) {
      models.push({
        id: 'nano-banana-pro',
        name: 'Nano Banana Pro',
        provider: 'Gemini',
        avatar: '/models/google.jpg',
        isImageModel: true,
        spend: aggregated.byModel['nano-banana-pro'],
        agentCount: 0,
        pricing: {
          prompt: PRICING['gemini-nano-banana']['1K'],
          completion: PRICING['gemini-nano-banana']['4K'],
        },
      })
    }

    return NextResponse.json({ 
      models,
      usingRealData: !!aggregated.openRouterRealData,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 })
  }
}

function getAgentCountsByModel(): Record<string, number> {
  const counts: Record<string, number> = {}
  
  for (const agent of Object.values(AGENT_METADATA)) {
    counts[agent.model] = (counts[agent.model] || 0) + 1
  }
  
  return counts
}
