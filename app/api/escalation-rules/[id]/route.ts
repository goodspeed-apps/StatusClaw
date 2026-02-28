import { NextResponse } from 'next/server'
import { escalationRuleStore } from '@/lib/escalation-rule-store'

export const dynamic = 'force-dynamic'

// GET - Fetch a single escalation rule
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const rule = escalationRuleStore.getById(id)
    
    if (!rule) {
      return NextResponse.json(
        { error: 'Escalation rule not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ rule })
  } catch (error) {
    console.error('Failed to fetch escalation rule:', error)
    return NextResponse.json(
      { error: 'Failed to fetch escalation rule' },
      { status: 500 }
    )
  }
}

// PATCH - Update an escalation rule
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const rule = escalationRuleStore.update(id, body)
    
    if (!rule) {
      return NextResponse.json(
        { error: 'Escalation rule not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ rule })
  } catch (error) {
    console.error('Failed to update escalation rule:', error)
    const message = error instanceof Error ? error.message : 'Failed to update escalation rule'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE - Delete an escalation rule
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const success = escalationRuleStore.delete(id)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Escalation rule not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete escalation rule:', error)
    const message = error instanceof Error ? error.message : 'Failed to delete escalation rule'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
