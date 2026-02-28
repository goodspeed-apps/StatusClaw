import { NextResponse } from 'next/server'
import { outcomeStore } from '@/lib/outcome-store'
import type { PeriodParam } from '@/types/outcome'

export const dynamic = 'force-dynamic'

// GET /api/v1/metrics/team - Get aggregate team metrics
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const periodParam = searchParams.get('period') as PeriodParam | null

    // Validate and set period (default to 30d)
    let period: PeriodParam = '30d'
    if (periodParam && ['7d', '30d', '90d'].includes(periodParam)) {
      period = periodParam
    }

    const metrics = outcomeStore.getTeamMetrics(period)

    return NextResponse.json({ metrics })
  } catch (error) {
    console.error('Failed to fetch team metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team metrics' },
      { status: 500 }
    )
  }
}
