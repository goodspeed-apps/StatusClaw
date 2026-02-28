import { NextResponse } from 'next/server'
import { webhookStore } from '@/lib/webhook-store'
import { testWebhook } from '@/lib/webhook-service'

export const dynamic = 'force-dynamic'

// POST /api/v1/webhooks/:id/test - Send test payload to webhook
export async function POST(
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

    const result = await testWebhook(webhook)

    return NextResponse.json({
      success: result.success,
      status_code: result.status_code,
      error: result.error,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to test webhook:', error)
    return NextResponse.json(
      { error: 'Failed to test webhook', success: false },
      { status: 500 }
    )
  }
}
