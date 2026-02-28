import { NextResponse } from 'next/server'
import { outcomeStore } from '@/lib/outcome-store'

export const dynamic = 'force-dynamic'

// GET /api/v1/outcomes/:incidentId - Get outcome by incident ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ incidentId: string }> }
) {
  try {
    const { incidentId } = await params

    if (!incidentId) {
      return NextResponse.json(
        { error: 'incidentId is required' },
        { status: 400 }
      )
    }

    const outcome = outcomeStore.getOutcomeByIncidentId(incidentId)

    if (!outcome) {
      return NextResponse.json(
        { error: 'Outcome not found for this incident' },
        { status: 404 }
      )
    }

    return NextResponse.json({ outcome })
  } catch (error) {
    console.error('Failed to fetch outcome:', error)
    return NextResponse.json(
      { error: 'Failed to fetch outcome' },
      { status: 500 }
    )
  }
}
