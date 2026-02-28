import { NextResponse } from 'next/server'
import { incidentStore } from '@/lib/incident-store'
import type { IncidentStatus } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

// GET - Fetch all updates for an incident
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const incident = incidentStore.getIncidentById(id)

    if (!incident) {
      return NextResponse.json(
        { error: 'Incident not found' },
        { status: 404 }
      )
    }

    const updates = [...incident.updates].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    return NextResponse.json({
      updates,
      count: updates.length,
    })
  } catch (error) {
    console.error('Failed to fetch updates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch updates' },
      { status: 500 }
    )
  }
}

// POST - Add an update to an incident
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { message, status, createdBy } = body

    if (!message || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: message, status' },
        { status: 400 }
      )
    }

    const update = incidentStore.addUpdate(id, {
      message,
      status: status as IncidentStatus,
      createdAt: new Date().toISOString(),
      createdBy: createdBy || 'system',
    })

    if (!update) {
      return NextResponse.json(
        { error: 'Incident not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ update }, { status: 201 })
  } catch (error) {
    console.error('Failed to add update:', error)
    return NextResponse.json(
      { error: 'Failed to add update' },
      { status: 500 }
    )
  }
}
