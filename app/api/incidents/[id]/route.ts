import { NextResponse } from 'next/server'
import { incidentStore } from '@/lib/incident-store'
import type { IncidentStatus } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

// GET - Fetch a single incident
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

    return NextResponse.json({ incident })
  } catch (error) {
    console.error('Failed to fetch incident:', error)
    return NextResponse.json(
      { error: 'Failed to fetch incident' },
      { status: 500 }
    )
  }
}

// PATCH - Update an incident
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, description, service, severity, status, resolvedAt } = body

    const updates: Partial<{ 
      title: string
      description: string
      service: string
      severity: 'critical' | 'high' | 'medium' | 'low'
      status: IncidentStatus
      resolvedAt: string
    }> = {}

    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (service !== undefined) updates.service = service
    if (severity !== undefined) updates.severity = severity
    if (status !== undefined) updates.status = status
    if (resolvedAt !== undefined) updates.resolvedAt = resolvedAt

    const incident = incidentStore.updateIncident(id, updates)

    if (!incident) {
      return NextResponse.json(
        { error: 'Incident not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ incident })
  } catch (error) {
    console.error('Failed to update incident:', error)
    return NextResponse.json(
      { error: 'Failed to update incident' },
      { status: 500 }
    )
  }
}
