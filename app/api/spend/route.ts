import { NextResponse } from 'next/server'
import { spendTracker, fetchOpenRouterKeyUsage, getAggregatedSpendData } from '@/lib/spend-tracker'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const openRouterKey = process.env.OPENROUTER_API_KEY
    
    let realData = null
    let usingRealData = false
    
    // Try to fetch real data from OpenRouter
    if (openRouterKey) {
      const result = await fetchOpenRouterKeyUsage(openRouterKey)
      if (result.success && result.usage) {
        realData = result.usage
        usingRealData = true
        
        // Add a record for tracking
        spendTracker.addRecord({
          timestamp: new Date().toISOString(),
          provider: 'openrouter',
          model: 'aggregate',
          agentId: 'system',
          cost: result.usage.weekly,
          tokens: { prompt: 0, completion: 0, total: 0 }
        })
      }
    }
    
    // Get aggregated data from tracker
    const aggregated = getAggregatedSpendData()
    
    // If we have real data from OpenRouter, use it for the current period
    const current = realData ? {
      day: realData.daily,
      week: realData.weekly,
      month: realData.monthly,
      total: realData.weekly * 4 // Estimate monthly from weekly
    } : aggregated.overall
    
    // Return spend data
    return NextResponse.json({
      current,
      byAgent: aggregated.byAgent,
      byModel: aggregated.byModel,
      usingRealData,
      lastUpdated: new Date().toISOString(),
      message: usingRealData 
        ? 'Using real OpenRouter data' 
        : 'Using estimated data - set OPENROUTER_API_KEY for real-time spend tracking'
    })
  } catch (error) {
    console.error('Spend API error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch spend data',
      message: String(error)
    }, { status: 500 })
  }
}