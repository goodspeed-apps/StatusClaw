import { NextRequest, NextResponse } from 'next/server'
import { 
  getDeduplicationStats,
  getNotificationsForIncident,
  clearNotificationStore 
} from '@/lib/notification-service'

/**
 * GET /api/notifications/stats
 * Get deduplication statistics and notification records
 * 
 * Query params:
 *   - incidentId: Filter by specific incident (optional)
 *   - clear: Set to 'true' to clear all records (debug only)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const incidentId = searchParams.get('incidentId')
    const shouldClear = searchParams.get('clear') === 'true'

    // Debug: Clear all records if requested
    if (shouldClear) {
      clearNotificationStore()
      return NextResponse.json({
        success: true,
        message: 'All notification records cleared'
      })
    }

    const stats = getDeduplicationStats()

    if (incidentId) {
      const notifications = getNotificationsForIncident(incidentId)
      return NextResponse.json({
        success: true,
        stats,
        incidentId,
        notifications: notifications.sort((a, b) => 
          new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
        )
      })
    }

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('[Notifications Stats API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get stats', details: (error as Error).message },
      { status: 500 }
    )
  }
}
