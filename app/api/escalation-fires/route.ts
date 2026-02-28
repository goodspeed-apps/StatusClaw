import { NextResponse } from 'next/server'
import { escalationRuleStore } from '@/lib/escalation-rule-store'

export const dynamic = 'force-dynamic'

// GET - Fetch escalation fires
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const incidentId = searchParams.get('incidentId')

    let fires
    if (incidentId) {
      fires = escalationRuleStore.getFiresForIncident(incidentId)
    } else {
      fires = escalationRuleStore.getFires()
    }

    return NextResponse.json({
      fires,
      count: fires.length,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch escalation fires:', error)
    return NextResponse.json(
      { error: 'Failed to fetch escalation fires' },
      { status: 500 }
    )
  }
}

// POST - Acknowledge a fire
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fireId } = body

    if (!fireId) {
      return NextResponse.json(
        { error: 'Missing required field: fireId' },
        { status: 400 }
      )
    }

    const fire = escalationRuleStore.acknowledgeFire(fireId)
    
    if (!fire) {
      return NextResponse.json(
        { error: 'Escalation fire not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ fire })
  } catch (error) {
    console.error('Failed to acknowledge escalation fire:', error)
    return NextResponse.json(
      { error: 'Failed to acknowledge escalation fire' },
      { status: 500 }
    )
  }
}
