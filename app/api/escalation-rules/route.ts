import { NextResponse } from 'next/server'
import { escalationRuleStore } from '@/lib/escalation-rule-store'

export const dynamic = 'force-dynamic'

// GET - Fetch all escalation rules
export async function GET() {
  try {
    const rules = escalationRuleStore.getAll()
    return NextResponse.json({
      rules,
      count: rules.length,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch escalation rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch escalation rules' },
      { status: 500 }
    )
  }
}

// POST - Create a new escalation rule
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, enabled, severityIds, statusIn, trigger, actions } = body

    if (!name || !trigger || !actions) {
      return NextResponse.json(
        { error: 'Missing required fields: name, trigger, actions' },
        { status: 400 }
      )
    }

    if (!trigger.kind || typeof trigger.minutes !== 'number') {
      return NextResponse.json(
        { error: 'Invalid trigger: must have kind and minutes' },
        { status: 400 }
      )
    }

    const rule = escalationRuleStore.create({
      name,
      description,
      enabled: enabled ?? true,
      severityIds: severityIds ?? [],
      statusIn: statusIn ?? ['investigating', 'identified', 'monitoring'],
      trigger,
      actions,
    })

    return NextResponse.json({ rule }, { status: 201 })
  } catch (error) {
    console.error('Failed to create escalation rule:', error)
    const message = error instanceof Error ? error.message : 'Failed to create escalation rule'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
