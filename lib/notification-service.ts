// Email notification service with idempotency/deduplication support
// Prevents duplicate emails for the same incident update

export interface NotificationRecord {
  idempotencyKey: string
  incidentId: string
  recipient: string
  type: NotificationType
  sentAt: string
  status: 'pending' | 'sent' | 'failed'
  retryCount: number
}

export type NotificationType = 
  | 'incident_created' 
  | 'incident_updated' 
  | 'incident_resolved' 
  | 'status_change'

export interface SendEmailRequest {
  incidentId: string
  recipient: string
  type: NotificationType
  subject: string
  body: string
  idempotencyKey?: string // Optional: auto-generated if not provided
}

// In-memory store for notification records (replace with Redis/DB in production)
const notificationStore = new Map<string, NotificationRecord>()

// Deduplication window: 24 hours (in milliseconds)
const DEDUPLICATION_WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * Generate a unique idempotency key for a notification
 * Format: incidentId:recipient:type:timestampWindow
 */
export function generateIdempotencyKey(
  incidentId: string,
  recipient: string,
  type: NotificationType,
  timeWindow: string = getTimeWindow()
): string {
  return `${incidentId}:${recipient}:${type}:${timeWindow}`
}

/**
 * Get current time window (hour-based to group notifications within same hour)
 */
function getTimeWindow(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}-${now.getUTCHours()}`
}

/**
 * Check if a notification has already been sent (idempotency check)
 */
export function hasNotificationBeenSent(idempotencyKey: string): boolean {
  const record = notificationStore.get(idempotencyKey)
  if (!record) return false

  // Check if within deduplication window
  const sentAt = new Date(record.sentAt).getTime()
  const now = Date.now()
  
  if (now - sentAt > DEDUPLICATION_WINDOW_MS) {
    // Expired, remove from store
    notificationStore.delete(idempotencyKey)
    return false
  }

  return record.status === 'sent'
}

/**
 * Record a notification as sent (for deduplication)
 */
export function recordNotification(record: NotificationRecord): void {
  notificationStore.set(record.idempotencyKey, record)
  
  // Cleanup old records periodically (simple approach)
  cleanupOldRecords()
}

/**
 * Get notification record by idempotency key
 */
export function getNotificationRecord(idempotencyKey: string): NotificationRecord | undefined {
  return notificationStore.get(idempotencyKey)
}

/**
 * Send email with deduplication protection
 * Returns { sent: true } if sent successfully
 * Returns { sent: false, reason: 'duplicate' } if already sent
 */
export async function sendEmailWithDeduplication(
  request: SendEmailRequest
): Promise<{ sent: boolean; record: NotificationRecord; reason?: string }> {
  const idempotencyKey = request.idempotencyKey || generateIdempotencyKey(
    request.incidentId,
    request.recipient,
    request.type
  )

  // Check for duplicates
  if (hasNotificationBeenSent(idempotencyKey)) {
    const existing = getNotificationRecord(idempotencyKey)
    return {
      sent: false,
      reason: 'duplicate',
      record: existing!
    }
  }

  // Create pending record
  const record: NotificationRecord = {
    idempotencyKey,
    incidentId: request.incidentId,
    recipient: request.recipient,
    type: request.type,
    sentAt: new Date().toISOString(),
    status: 'pending',
    retryCount: 0
  }

  // Check for in-flight notification (race condition protection)
  const existingPending = notificationStore.get(idempotencyKey)
  if (existingPending?.status === 'pending') {
    return {
      sent: false,
      reason: 'already_in_progress',
      record: existingPending
    }
  }

  recordNotification(record)

  try {
    // Simulate email sending (replace with actual email provider)
    await simulateEmailSend(request)
    
    // Mark as sent
    record.status = 'sent'
    recordNotification(record)

    return { sent: true, record }
  } catch (error) {
    record.status = 'failed'
    record.retryCount++
    recordNotification(record)
    
    throw error
  }
}

/**
 * Simulate sending an email (replace with actual provider like Resend, SendGrid, etc.)
 */
async function simulateEmailSend(request: SendEmailRequest): Promise<void> {
  // In production, this would call an email provider API
  console.log(`[Email] Sending to ${request.recipient}: ${request.subject}`)
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Simulate occasional failures (5% failure rate for testing retry logic)
  if (Math.random() < 0.05) {
    throw new Error('Simulated email send failure')
  }
}

/**
 * Cleanup old notification records to prevent memory leaks
 */
function cleanupOldRecords(): void {
  const now = Date.now()
  let cleaned = 0
  
  for (const [key, record] of notificationStore.entries()) {
    const sentAt = new Date(record.sentAt).getTime()
    if (now - sentAt > DEDUPLICATION_WINDOW_MS) {
      notificationStore.delete(key)
      cleaned++
    }
  }
  
  if (cleaned > 0) {
    console.log(`[NotificationService] Cleaned up ${cleaned} old records`)
  }
}

/**
 * Get deduplication stats for monitoring
 */
export function getDeduplicationStats(): {
  totalRecords: number
  sent: number
  pending: number
  failed: number
  duplicatesPrevented: number
} {
  let sent = 0
  let pending = 0
  let failed = 0

  for (const record of notificationStore.values()) {
    if (record.status === 'sent') sent++
    else if (record.status === 'pending') pending++
    else if (record.status === 'failed') failed++
  }

  return {
    totalRecords: notificationStore.size,
    sent,
    pending,
    failed,
    duplicatesPrevented: 0 // Would need to track this separately with a counter
  }
}

/**
 * Clear all notification records (useful for testing)
 */
export function clearNotificationStore(): void {
  notificationStore.clear()
}

/**
 * Get all notifications for an incident
 */
export function getNotificationsForIncident(incidentId: string): NotificationRecord[] {
  return Array.from(notificationStore.values())
    .filter(r => r.incidentId === incidentId)
}
