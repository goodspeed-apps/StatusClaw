import { NextResponse } from 'next/server'
import { webhookStore } from '@/lib/webhook-store'
import { testWebhook } from '@/lib/webhook-service'
import type { UpdateWebhookRequest } from '@/types/webhook'

export const dynamic = 'force-dynamic'

// Helper to get workspace ID from request header
function getWorkspaceId(request: Request): string {
  const workspaceHeader = request.headers.get('x-workspace-id')
  if (workspaceHeader) return workspaceHeader
  return 'ws_default'
}

// Mask URL for security
function maskWebhookUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.hostname}/***`
  } catch {
    return '***'
  }
}

function validateUpdateWebhookRequest(body: unknown): { valid: boolean; error?: string; data?: UpdateWebhookRequest } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' }
  }

  const data = body as Record<string, unknown>

  if (data.webhook_url !== undefined) {
    if (typeof data.webhook_url !== 'string') {
      return { valid: false, error: 'webhook_url must be a string' }
    }
    if (data.webhook_url.length > 500) {
      return { valid: false, error: 'webhook_url must be <= 500 characters' }
    }
  }

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

  if (data.enabled !== undefined && typeof data.enabled !== 'boolean') {
    return { valid: false, error: 'enabled must be a boolean' }
  }

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

// GET /api/v1/webhooks/:id - Get single webhook
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const webhook = webhookStore.getWebhookById(id)

    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      )
    }

    // Mask URL in response
    return NextResponse.json({
      webhook: {
        ...webhook,
        webhook_url: maskWebhookUrl(webhook.webhook_url),
        auth_header: webhook.auth_header ? '***' : undefined,
      }
    })
  } catch (error) {
    console.error('Failed to fetch webhook:', error)
    return NextResponse.json(
      { error: 'Failed to fetch webhook' },
      { status: 500 }
    )
  }
}

// PUT /api/v1/webhooks/:id - Update webhook
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const validation = validateUpdateWebhookRequest(body)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const updated = webhookStore.updateWebhook(id, validation.data!)

    if (!updated) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      webhook: {
        ...updated,
        webhook_url: maskWebhookUrl(updated.webhook_url),
        auth_header: updated.auth_header ? '***' : undefined,
      }
    })
  } catch (error) {
    console.error('Failed to update webhook:', error)

    if (error instanceof Error && error.message.startsWith('INVALID_URL:')) {
      return NextResponse.json(
        { error: 'Webhook URL must be a valid HTTPS URL' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update webhook' },
      { status: 500 }
    )
  }
}

// DELETE /api/v1/webhooks/:id - Delete webhook
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const deleted = webhookStore.deleteWebhook(id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete webhook:', error)
    return NextResponse.json(
      { error: 'Failed to delete webhook' },
      { status: 500 }
    )
  }
}
