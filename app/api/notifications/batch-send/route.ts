import { NextRequest, NextResponse } from 'next/server'
import { 
  sendEmailWithDeduplication, 
  getDeduplicationStats,
  getNotificationsForIncident,
  clearNotificationStore,
  SendEmailRequest 
} from '@/lib/notification-service'

/**
 * POST /api/notifications/batch-send
 * Send multiple email notifications with deduplication protection
 * Efficiently handles batch operations for incident updates
 * 
 * Request body: {
 *   notifications: Array<{
 *     incidentId: string
 *     recipient: string
 *     type: 'incident_created' | 'incident_updated' | 'incident_resolved' | 'status_change'
 *     subject: string
 *     body: string
 *     idempotencyKey?: string
 *   }>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.notifications || !Array.isArray(body.notifications)) {
      return NextResponse.json(
        { error: 'Missing or invalid notifications array' },
        { status: 400 }
      )
    }

    if (body.notifications.length === 0) {
      return NextResponse.json(
        { error: 'Notifications array cannot be empty' },
        { status: 400 }
      )
    }

    if (body.notifications.length > 100) {
      return NextResponse.json(
        { error: 'Batch size exceeds maximum of 100 notifications' },
        { status: 400 }
      )
    }

    const results = []
    let sent = 0
    let deduplicated = 0
    let failed = 0

    // Process notifications sequentially to avoid race conditions
    for (const notification of body.notifications) {
      // Validate required fields
      const required = ['incidentId', 'recipient', 'type', 'subject', 'body']
      const missing = required.filter(f => !notification[f])
      
      if (missing.length > 0) {
        results.push({
          success: false,
          error: `Missing fields: ${missing.join(', ')}`,
          notification
        })
        failed++
        continue
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(notification.recipient)) {
        results.push({
          success: false,
          error: 'Invalid recipient email format',
          notification
        })
        failed++
        continue
      }

      try {
        const result = await sendEmailWithDeduplication(notification as SendEmailRequest)
        
        if (result.sent) {
          sent++
          results.push({
            success: true,
            deduplicated: false,
            idempotencyKey: result.record.idempotencyKey,
            sentAt: result.record.sentAt
          })
        } else if (result.reason === 'duplicate' || result.reason === 'already_in_progress') {
          deduplicated++
          results.push({
            success: true,
            deduplicated: true,
            reason: result.reason,
            idempotencyKey: result.record.idempotencyKey,
            originallySentAt: result.record.sentAt
          })
        }
      } catch (error) {
        failed++
        results.push({
          success: false,
          error: (error as Error).message,
          notification
        })
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: body.notifications.length,
        sent,
        deduplicated,
        failed
      },
      results
    }, { status: 200 })

  } catch (error) {
    console.error('[Notifications Batch API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process batch notifications', details: (error as Error).message },
      { status: 500 }
    )
  }
}
