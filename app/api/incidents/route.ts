import { NextResponse } from 'next/server'
import { incidentStore } from '@/lib/incident-store'
import type { Incident, IncidentStatus } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

// GET - Fetch all incidents or filter by status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as IncidentStatus | null
    const ongoing = searchParams.get('ongoing')

    let incidents: Incident[]

    if (status) {
      incidents = incidentStore.getIncidentsByStatus(status)
    } else if (ongoing === 'true') {
      incidents = incidentStore.getOngoingIncidents()
    } else {
      incidents = incidentStore.getIncidents()
    }

    return NextResponse.json({
      incidents,
      count: incidents.length,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch incidents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch incidents' },
      { status: 500 }
    )
  }
}

// POST - Create a new incident
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, description, service, severity, status = 'investigating' } = body

    if (!title || !description || !service) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, service' },
        { status: 400 }
      )
    }

    const incident = incidentStore.createIncident({
      title,
      description,
      service,
      severity,
      status,
      startedAt: new Date().toISOString(),
    })

    return NextResponse.json({ incident }, { status: 201 })
  } catch (error) {
    console.error('Failed to create incident:', error)
    return NextResponse.json(
      { error: 'Failed to create incident' },
      { status: 500 }
    )
  }
}
