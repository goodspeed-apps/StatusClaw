import { NextResponse } from 'next/server'
import { outcomeStore } from '@/lib/outcome-store'
import type { CreateOutcomeRequest } from '@/types/outcome'

export const dynamic = 'force-dynamic'

// Validation helper
function validateOutcomeRequest(body: unknown): { valid: boolean; error?: string; data?: CreateOutcomeRequest } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' }
  }

  const data = body as Record<string, unknown>

  // Required fields
  if (!data.incident_id || typeof data.incident_id !== 'string') {
    return { valid: false, error: 'Missing required field: incident_id (string)' }
  }

  if (typeof data.time_to_resolve_seconds !== 'number' || !Number.isInteger(data.time_to_resolve_seconds)) {
    return { valid: false, error: 'Missing or invalid required field: time_to_resolve_seconds (integer >= 0)' }
  }

  if (data.time_to_resolve_seconds < 0) {
    return { valid: false, error: 'time_to_resolve_seconds must be >= 0' }
  }

  if (!data.root_cause || typeof data.root_cause !== 'string') {
    return { valid: false, error: 'Missing required field: root_cause (string)' }
  }

  if (data.root_cause.length > 2000) {
    return { valid: false, error: 'root_cause must be <= 2000 characters' }
  }

  // Optional fields
  if (data.satisfaction_score !== undefined) {
    if (typeof data.satisfaction_score !== 'number' || !Number.isInteger(data.satisfaction_score)) {
      return { valid: false, error: 'satisfaction_score must be an integer' }
    }
    if (data.satisfaction_score < 1 || data.satisfaction_score > 5) {
      return { valid: false, error: 'satisfaction_score must be between 1 and 5' }
    }
  }

  if (data.notes !== undefined && typeof data.notes !== 'string') {
    return { valid: false, error: 'notes must be a string' }
  }

  if (data.notes && data.notes.length > 5000) {
    return { valid: false, error: 'notes must be <= 5000 characters' }
  }

  if (data.resolved_by !== undefined && typeof data.resolved_by !== 'string') {
    return { valid: false, error: 'resolved_by must be a string' }
  }

  return {
    valid: true,
    data: {
      incident_id: data.incident_id,
      time_to_resolve_seconds: data.time_to_resolve_seconds,
      root_cause: data.root_cause,
      satisfaction_score: data.satisfaction_score,
      resolved_by: data.resolved_by,
      notes: data.notes,
    }
  }
}

// POST /api/v1/outcomes - Create a new outcome
export async function POST(request: Request) {
  let body: Record<string, unknown> = {}
  
  try {
    body = await request.json()

    // Validate input
    const validation = validateOutcomeRequest(body)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const outcome = outcomeStore.createOutcome(validation.data!)

    return NextResponse.json({ outcome }, { status: 201 })
  } catch (error) {
    console.error('Failed to create outcome:', error)

    if (error instanceof Error) {
      if (error.message === 'INCIDENT_NOT_FOUND') {
        return NextResponse.json(
          { error: 'Incident not found' },
          { status: 404 }
        )
      }
      if (error.message === 'OUTCOME_ALREADY_EXISTS') {
        const existing = outcomeStore.getOutcomeByIncidentId(
          body.incident_id as string
        )
        return NextResponse.json(
          { error: 'Outcome already exists for this incident', existing },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create outcome' },
      { status: 500 }
    )
  }
}

// GET /api/v1/outcomes - List all outcomes (optional, for debugging)
export async function GET() {
  try {
    const outcomes = outcomeStore.getOutcomes()
    return NextResponse.json({
      outcomes,
      count: outcomes.length,
    })
  } catch (error) {
    console.error('Failed to fetch outcomes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch outcomes' },
      { status: 500 }
    )
  }
}
