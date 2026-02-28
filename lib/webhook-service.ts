// Webhook delivery service - handles sending webhook payloads with retry logic

import type { WorkspaceWebhook, Feedback, FeedbackSubmittedEvent } from '@/types/webhook'
import { webhookStore } from './webhook-store'

const WEBHOOK_TIMEOUT_MS = 10000 // 10 seconds
const MAX_RETRIES = 3
const RETRY_DELAYS = [60000, 300000, 900000] // 1min, 5min, 15min

interface DeliveryResult {
  success: boolean
  webhook_id: string
  status_code?: number
  error?: string
  attempts: number
  timestamp: string
}

/**
 * Build the feedback.submitted event payload
 */
export function buildFeedbackEventPayload(
  feedback: Feedback,
  incidentTitle: string,
  incidentSeverity: string
): FeedbackSubmittedEvent {
  return {
    event: 'feedback.submitted',
    timestamp: new Date().toISOString(),
    data: {
      feedback_id: feedback.id,
      incident_id: feedback.incident_id,
      incident_title: incidentTitle,
      workspace_id: feedback.workspace_id,
      submitted_by: feedback.submitted_by,
      feedback: feedback.feedback,
      metadata: {
        source: 'api',
        incident_severity: incidentSeverity,
      },
    },
  }
}

/**
 * Send a single webhook delivery
 */
async function sendWebhook(
  webhook: WorkspaceWebhook,
  payload: unknown
): Promise<DeliveryResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'StatusClaw-Webhook/1.0',
  }

  // Add auth header if configured
  if (webhook.auth_header) {
    // Support Bearer token or raw API key
    if (webhook.auth_header.startsWith('Bearer ') || webhook.auth_header.startsWith('Basic ')) {
      headers['Authorization'] = webhook.auth_header
    } else {
      headers['Authorization'] = `Bearer ${webhook.auth_header}`
    }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS)

    const response = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      return {
        success: true,
        webhook_id: webhook.id,
        status_code: response.status,
        attempts: 1,
        timestamp: new Date().toISOString(),
      }
    } else {
      const errorText = await response.text().catch(() => 'Unknown error')
      return {
        success: false,
        webhook_id: webhook.id,
        status_code: response.status,
        error: `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
        attempts: 1,
        timestamp: new Date().toISOString(),
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isAborted = error instanceof Error && error.name === 'AbortError'
    
    return {
      success: false,
      webhook_id: webhook.id,
      error: isAborted ? 'Request timeout' : errorMessage,
      attempts: 1,
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Deliver webhook with retry logic
 * This is a simplified implementation - in production, you'd use a job queue
 */
export async function deliverWebhookWithRetry(
  webhook: WorkspaceWebhook,
  payload: unknown
): Promise<DeliveryResult> {
  let lastResult: DeliveryResult | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const result = await sendWebhook(webhook, payload)
    lastResult = result

    if (result.success) {
      console.log(`[Webhook] Delivery successful to ${webhook.webhook_url} (attempt ${attempt + 1})`)
      return result
    }

    console.log(`[Webhook] Delivery failed to ${webhook.webhook_url}: ${result.error} (attempt ${attempt + 1}/${MAX_RETRIES})`)

    // Wait before retry (skip on last attempt)
    if (attempt < MAX_RETRIES - 1) {
      const delay = RETRY_DELAYS[attempt]
      console.log(`[Webhook] Retrying in ${delay / 1000} seconds...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  console.error(`[Webhook] All retries exhausted for ${webhook.webhook_url}`)
  return {
    ...lastResult!,
    attempts: MAX_RETRIES,
  }
}

/**
 * Trigger feedback submitted webhook event
 * Called after feedback is created
 */
export async function triggerFeedbackWebhook(
  feedback: Feedback,
  incidentTitle: string,
  incidentSeverity: string = 'unknown'
): Promise<DeliveryResult[]> {
  const webhooks = webhookStore.getEnabledWebhooks(feedback.workspace_id, 'feedback.submitted')
  
  if (webhooks.length === 0) {
    console.log(`[Webhook] No enabled webhooks for workspace ${feedback.workspace_id} listening for feedback.submitted`)
    return []
  }

  const payload = buildFeedbackEventPayload(feedback, incidentTitle, incidentSeverity)
  const results: DeliveryResult[] = []

  // Send to all webhooks in parallel
  const deliveryPromises = webhooks.map(webhook => 
    deliverWebhookWithRetry(webhook, payload)
  )

  const deliveredResults = await Promise.all(deliveryPromises)
  results.push(...deliveredResults)

  return results
}

/**
 * Test webhook by sending a synthetic payload
 */
export async function testWebhook(
  webhook: WorkspaceWebhook
): Promise<{ success: boolean; status_code?: number; error?: string }> {
  const testPayload = {
    event: 'webhook.test',
    timestamp: new Date().toISOString(),
    data: {
      message: 'This is a test webhook from StatusClaw',
      workspace_id: webhook.workspace_id,
    },
  }

  const result = await sendWebhook(webhook, testPayload)
  return {
    success: result.success,
    status_code: result.status_code,
    error: result.error,
  }
}
