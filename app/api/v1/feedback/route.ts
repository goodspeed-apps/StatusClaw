import { NextResponse } from 'next/server'
import { feedbackStore, getFeedbackStore } from '@/lib/feedback-store'
import { triggerFeedbackWebhook } from '@/lib/webhook-service'
import { incidentStore, getIncidentStore } from '@/lib/incident-store'
import type { CreateFeedbackRequest } from '@/types/webhook'

export const dynamic = 'force-dynamic'

// Helper to get workspace ID from request header
function getWorkspaceId(request: Request): string {
  const workspaceHeader = request.headers.get('x-workspace-id')
  if (workspaceHeader) return workspaceHeader
  return 'ws_default'
}

// Validation helper
function validateCreateFeedbackRequest(body: unknown): { valid: boolean; error?: string; data?: CreateFeedbackRequest } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' }
  }

  const data = body as Record<string, unknown>

  // Required fields
  if (!data.incident_id || typeof data.incident_id !== 'string') {
    return { valid: false, error: 'Missing required field: incident_id (string)' }
  }

  if (!data.workspace_id || typeof data.workspace_id !== 'string') {
    return { valid: false, error: 'Missing required field: workspace_id (string)' }
  }

  // submitted_by validation
  if (!data.submitted_by || typeof data.submitted_by !== 'object') {
    return { valid: false, error: 'Missing required field: submitted_by (object)' }
  }

  const submittedBy = data.submitted_by as Record<string, unknown>
  if (!submittedBy.user_id || typeof submittedBy.user_id !== 'string') {
    return { valid: false, error: 'Missing required field: submitted_by.user_id' }
  }
  if (!submittedBy.email || typeof submittedBy.email !== 'string') {
    return { valid: false, error: 'Missing required field: submitted_by.email' }
  }
  if (!submittedBy.name || typeof submittedBy.name !== 'string') {
    return { valid: false, error: 'Missing required field: submitted_by.name' }
  }

  // feedback validation
  if (!data.feedback || typeof data.feedback !== 'object') {
    return { valid: false, error: 'Missing required field: feedback (object)' }
  }

  const feedback = data.feedback as Record<string, unknown>

  if (typeof feedback.satisfaction_score !== 'number' || !Number.isInteger(feedback.satisfaction_score)) {
    return { valid: false, error: 'Missing or invalid required field: feedback.satisfaction_score (integer 1-5)' }
  }

  if (feedback.satisfaction_score < 1 || feedback.satisfaction_score > 5) {
    return { valid: false, error: 'feedback.satisfaction_score must be between 1 and 5' }
  }

  if (feedback.would_recommend !== undefined && typeof feedback.would_recommend !== 'boolean') {
    return { valid: false, error: 'feedback.would_recommend must be a boolean' }
  }

  if (feedback.response_quality_comment !== undefined && typeof feedback.response_quality_comment !== 'string') {
    return { valid: false, error: 'feedback.response_quality_comment must be a string' }
  }

  if (feedback.additional_notes !== undefined && typeof feedback.additional_notes !== 'string') {
    return { valid: false, error: 'feedback.additional_notes must be a string' }
  }

  return {
    valid: true,
    data: {
      incident_id: data.incident_id,
      workspace_id: data.workspace_id,
      submitted_by: {
        user_id: submittedBy.user_id,
        email: submittedBy.email,
        name: submittedBy.name,
      },
      feedback: {
        satisfaction_score: feedback.satisfaction_score,
        response_quality_comment: feedback.response_quality_comment as string | undefined,
        would_recommend: feedback.would_recommend as boolean ?? false,
        additional_notes: feedback.additional_notes as string | undefined,
      },
    }
  }
}

// POST /api/v1/feedback - Create feedback and trigger webhooks
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input
    const validation = validateCreateFeedbackRequest(body)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const feedbackData = validation.data!

    // Validate incident exists
    const incident = incidentStore.getIncidentById(feedbackData.incident_id)
    if (!incident) {
      return NextResponse.json(
        { error: 'Incident not found' },
        { status: 404 }
      )
    }

    // Create feedback
    const feedback = feedbackStore.createFeedback(feedbackData)

    // Trigger webhook asynchronously (fire and forget for now, in production use job queue)
    // We don't await this to avoid blocking the response
    triggerFeedbackWebhook(
      feedback,
      incident.title,
      incident.severity || 'unknown'
    ).catch(err => {
      console.error('[Webhook] Failed to trigger feedback webhook:', err)
    })

    return NextResponse.json({ feedback }, { status: 201 })
  } catch (error) {
    console.error('Failed to create feedback:', error)

    if (error instanceof Error && error.message.startsWith('INVALID_SATISFACTION_SCORE:')) {
      return NextResponse.json(
        { error: 'Satisfaction score must be between 1 and 5' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create feedback' },
      { status: 500 }
    )
  }
}

// GET /api/v1/feedback - List feedback (optional, for debugging)
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const incidentId = url.searchParams.get('incident_id')
    const workspaceId = url.searchParams.get('workspace_id') || getWorkspaceId(request)

    let feedback
    if (incidentId) {
      feedback = feedbackStore.getFeedbackByIncidentId(incidentId)
    } else if (workspaceId) {
      feedback = feedbackStore.getFeedbackByWorkspace(workspaceId)
    } else {
      feedback = feedbackStore.getFeedback()
    }

    return NextResponse.json({
      feedback,
      count: feedback.length,
    })
  } catch (error) {
    console.error('Failed to fetch feedback:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    )
  }
}
