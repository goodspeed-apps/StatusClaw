import { NextResponse } from 'next/server'
import { getAggregatedSpendData, PRICING } from '@/lib/spend-tracker'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const openRouterKey = process.env.OPENROUTER_API_KEY
    
    // Get aggregated data - this will fetch real OpenRouter data if key is available
    const aggregated = await getAggregatedSpendData(openRouterKey)
    
    // Determine current spend - use real data if available
    const current = aggregated.openRouterRealData ? {
      day: aggregated.openRouterRealData.daily,
      week: aggregated.openRouterRealData.weekly,
      month: aggregated.openRouterRealData.monthly,
      total: aggregated.overall.total // Keep total from tracked records
    } : aggregated.overall
    
    const usingRealData = !!aggregated.openRouterRealData
    
    // Return spend data
    return NextResponse.json({
      current,
      byAgent: aggregated.byAgent,
      byModel: aggregated.byModel,
      byProvider: aggregated.byProvider,
      usingRealData,
      pricing: PRICING,
      lastUpdated: new Date().toISOString(),
      message: usingRealData 
        ? 'Using real OpenRouter data + tracked Nano Banana Pro costs' 
        : 'Using estimated data - add OPENROUTER_API_KEY for real-time spend tracking'
    })
  } catch (error) {
    console.error('Spend API error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch spend data',
      message: String(error)
    }, { status: 500 })
  }
}
