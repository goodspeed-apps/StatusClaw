import { NextResponse } from 'next/server'
import { webhookStore, getWebhookStore } from '@/lib/webhook-store'
import { testWebhook } from '@/lib/webhook-service'
import type { CreateWebhookRequest, UpdateWebhookRequest } from '@/types/webhook'

export const dynamic = 'force-dynamic'

// Helper to get workspace ID from request header or query
// In production, this would come from auth/session
function getWorkspaceId(request: Request): string {
  // Check header first
  const workspaceHeader = request.headers.get('x-workspace-id')
  if (workspaceHeader) return workspaceHeader
  
  // Default workspace for demo
  return 'ws_default'
}

// Validation helper
function validateCreateWebhookRequest(body: unknown): { valid: boolean; error?: string; data?: CreateWebhookRequest } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' }
  }

  const data = body as Record<string, unknown>

  if (!data.webhook_url || typeof data.webhook_url !== 'string') {
    return { valid: false, error: 'Missing required field: webhook_url (string)' }
  }

  if (data.webhook_url.length > 500) {
    return { valid: false, error: 'webhook_url must be <= 500 characters' }
  }

  // Validate event_types if provided
  if (data.event_types !== undefined) {
    if (!Array.isArray(data.event_types)) {
      return { valid: false, error: 'event_types must be an array' }
    }
    for (const et of data.event_types) {
      if (typeof et !== 'string') {
        return { valid: false, error: 'event_types must contain strings' }
      }
    }
  }

  // Validate enabled if provided
  if (data.enabled !== undefined && typeof data.enabled !== 'boolean') {
    return { valid: false, error: 'enabled must be a boolean' }
  }

  // Validate auth_header if provided
  if (data.auth_header !== undefined && typeof data.auth_header !== 'string') {
    return { valid: false, error: 'auth_header must be a string' }
  }

  return {
    valid: true,
    data: {
      webhook_url: data.webhook_url,
      enabled: data.enabled as boolean | undefined,
      event_types: data.event_types as string[] | undefined,
      auth_header: data.auth_header as string | undefined,
    }
  }
}

function validateUpdateWebhookRequest(body: unknown): { valid: boolean; error?: string; data?: UpdateWebhookRequest } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' }
  }

  const data = body as Record<string, unknown>

  // webhook_url is optional in update
  if (data.webhook_url !== undefined) {
    if (typeof data.webhook_url !== 'string') {
      return { valid: false, error: 'webhook_url must be a string' }
    }
    if (data.webhook_url.length > 500) {
      return { valid: false, error: 'webhook_url must be <= 500 characters' }
    }
  }

  // Validate event_types if provided
  if (data.event_types !== undefined) {
    if (!Array.isArray(data.event_types)) {
      return { valid: false, error: 'event_types must be an array' }
    }
    for (const et of data.event_types) {
      if (typeof et !== 'string') {
        return { valid: false, error: 'event_types must contain strings' }
      }
    }
  }

  // Validate enabled if provided
  if (data.enabled !== undefined && typeof data.enabled !== 'boolean') {
    return { valid: false, error: 'enabled must be a boolean' }
  }

  // Validate auth_header if provided
  if (data.auth_header !== undefined && typeof data.auth_header !== 'string') {
    return { valid: false, error: 'auth_header must be a string' }
  }

  return {
    valid: true,
    data: {
      webhook_url: data.webhook_url as string | undefined,
      enabled: data.enabled as boolean | undefined,
      event_types: data.event_types as string[] | undefined,
      auth_header: data.auth_header as string | undefined,
    }
  }
}

// Mask URL for security in responses
function maskWebhookUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.pathname === '/') {
      return `${parsed.protocol}//${parsed.hostname}/***`
    }
    return `${parsed.protocol}//${parsed.hostname}/***`
  } catch {
    return '***'
  }
}

// POST /api/v1/webhooks - Create a new webhook
export async function POST(request: Request) {
  try {
    const workspaceId = getWorkspaceId(request)
    const body = await request.json()

    // Validate input
    const validation = validateCreateWebhookRequest(body)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const webhook = webhookStore.createWebhook(workspaceId, validation.data!)

    // Return with masked URL
    return NextResponse.json({
      webhook: {
        ...webhook,
        webhook_url: maskWebhookUrl(webhook.webhook_url),
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create webhook:', error)

    if (error instanceof Error) {
      if (error.message.startsWith('INVALID_URL:')) {
        return NextResponse.json(
          { error: 'Webhook URL must be a valid HTTPS URL' },
          { status: 400 }
        )
      }
      if (error.message.startsWith('MAX_WEBHOOKS_REACHED:')) {
        return NextResponse.json(
          { error: 'Maximum 5 webhooks per workspace' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create webhook' },
      { status: 500 }
    )
  }
}

// GET /api/v1/webhooks - List webhooks for workspace
export async function GET() {
  try {
    // For demo, use default workspace
    // In production, get from auth
    const workspaceId = 'ws_default'
    const webhooks = webhookStore.getWebhooksByWorkspace(workspaceId)

    // Mask URLs in response
    const maskedWebhooks = webhooks.map(w => ({
      ...w,
      webhook_url: maskWebhookUrl(w.webhook_url),
      auth_header: w.auth_header ? '***' : undefined,
    }))

    return NextResponse.json({
      webhooks: maskedWebhooks,
      count: maskedWebhooks.length,
    })
  } catch (error) {
    console.error('Failed to fetch webhooks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch webhooks' },
      { status: 500 }
    )
  }
}
