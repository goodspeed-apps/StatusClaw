// Email notification service with idempotency/deduplication support
// Prevents duplicate emails for the same incident update
// Uses Resend as the email provider when configured, otherwise logs only

import { Resend } from 'resend'

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

// Email configuration from environment
const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'notifications@statusclaw.com'
const EMAIL_ENABLED = !!RESEND_API_KEY

// Initialize Resend client if API key is available
const resend = EMAIL_ENABLED ? new Resend(RESEND_API_KEY) : null

/**
 * Check if email sending is enabled (based on env vars)
 */
export function isEmailEnabled(): boolean {
  return EMAIL_ENABLED
}

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
 * Returns { sent: false, reason: 'disabled' } if email is not configured
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
    // Send email (uses Resend if configured, otherwise logs)
    await sendEmail(request)
    
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
 * Send email using Resend if configured, otherwise log only (graceful degradation)
 */
async function sendEmail(request: SendEmailRequest): Promise<void> {
  // Log the email attempt regardless of whether email is enabled
  console.log(`[Email] Sending to ${request.recipient}: ${request.subject}`)
  console.log(`[Email] Status: ${isEmailEnabled() ? 'LIVE' : 'SIMULATED'} (RESEND_API_KEY ${RESEND_API_KEY ? 'configured' : 'not configured'})`)

  // If email is not enabled, simulate success without actually sending
  if (!EMAIL_ENABLED || !resend) {
    console.log(`[Email] Email sending disabled - simulating send to ${request.recipient}`)
    // Simulate network delay for consistent behavior
    await new Promise(resolve => setTimeout(resolve, 100))
    return
  }

  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM_ADDRESS,
      to: request.recipient,
      subject: request.subject,
      html: request.body,
      text: stripHtml(request.body),
      tags: [
        { name: 'incident_id', value: request.incidentId },
        { name: 'notification_type', value: request.type }
      ]
    })

    if (result.error) {
      throw new Error(`Resend API error: ${result.error.message}`)
    }

    console.log(`[Email] Successfully sent via Resend: ${result.data?.id}`)
  } catch (error) {
    console.error('[Email] Resend send failed:', error)
    throw error
  }
}

/**
 * Strip HTML tags for plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
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
  emailEnabled: boolean
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
    duplicatesPrevented: 0, // Would need to track this separately with a counter
    emailEnabled: EMAIL_ENABLED
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
