import { NextResponse } from 'next/server'
import { incidentStore } from '@/lib/incident-store'

export const dynamic = 'force-dynamic'

// GET - Fetch timeline for an incident
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const timeline = incidentStore.getTimeline(id)

    if (!timeline) {
      return NextResponse.json(
        { error: 'Incident not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ timeline })
  } catch (error) {
    console.error('Failed to fetch timeline:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timeline' },
      { status: 500 }
    )
  }
}
