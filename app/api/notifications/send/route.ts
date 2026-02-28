import { NextRequest, NextResponse } from 'next/server'
import { 
  sendEmailWithDeduplication, 
  generateIdempotencyKey,
  getDeduplicationStats,
  getNotificationsForIncident,
  clearNotificationStore,
  SendEmailRequest 
} from '@/lib/notification-service'

/**
 * POST /api/notifications/send
 * Send email notification with deduplication protection
 * 
 * Request body: {
 *   incidentId: string
 *   recipient: string
 *   type: 'incident_created' | 'incident_updated' | 'incident_resolved' | 'status_change'
 *   subject: string
 *   body: string
 *   idempotencyKey?: string (optional)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const required = ['incidentId', 'recipient', 'type', 'subject', 'body']
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.recipient)) {
      return NextResponse.json(
        { error: 'Invalid recipient email format' },
        { status: 400 }
      )
    }

    // Validate notification type
    const validTypes = ['incident_created', 'incident_updated', 'incident_resolved', 'status_change']
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const sendRequest: SendEmailRequest = {
      incidentId: body.incidentId,
      recipient: body.recipient,
      type: body.type,
      subject: body.subject,
      body: body.body,
      idempotencyKey: body.idempotencyKey
    }

    const result = await sendEmailWithDeduplication(sendRequest)

    if (!result.sent && result.reason === 'duplicate') {
      return NextResponse.json({
        success: true,
        deduplicated: true,
        message: 'Notification already sent (duplicate detected)',
        idempotencyKey: result.record.idempotencyKey,
        originallySentAt: result.record.sentAt
      }, { status: 200 })
    }

    if (!result.sent && result.reason === 'already_in_progress') {
      return NextResponse.json({
        success: true,
        deduplicated: true,
        message: 'Notification already in progress',
        idempotencyKey: result.record.idempotencyKey
      }, { status: 200 })
    }

    return NextResponse.json({
      success: true,
      deduplicated: false,
      message: 'Notification sent successfully',
      idempotencyKey: result.record.idempotencyKey,
      sentAt: result.record.sentAt
    }, { status: 200 })

  } catch (error) {
    console.error('[Notifications API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to send notification', details: (error as Error).message },
      { status: 500 }
    )
  }
}
