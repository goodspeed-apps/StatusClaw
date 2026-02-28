import { NextResponse } from 'next/server'
import { evaluateAllIncidents } from '@/lib/escalation-engine'

export const dynamic = 'force-dynamic'

// POST - Run escalation evaluation tick
export async function POST(request: Request) {
  try {
    // Check for authorization token (optional, for cron job protection)
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.ESCALATION_PROCESS_TOKEN
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const results = evaluateAllIncidents()
    const triggered = results.filter(r => r.triggered)

    return NextResponse.json({
      processed: results.length,
      triggered: triggered.length,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to process escalations:', error)
    return NextResponse.json(
      { error: 'Failed to process escalations' },
      { status: 500 }
    )
  }
}
