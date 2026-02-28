import { NextResponse } from 'next/server'
import { severityLevelStore } from '@/lib/severity-level-store'

export const dynamic = 'force-dynamic'

// GET - Fetch a single severity level
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const level = severityLevelStore.getById(id)
    
    if (!level) {
      return NextResponse.json(
        { error: 'Severity level not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ level })
  } catch (error) {
    console.error('Failed to fetch severity level:', error)
    return NextResponse.json(
      { error: 'Failed to fetch severity level' },
      { status: 500 }
    )
  }
}

// PATCH - Update a severity level
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const level = severityLevelStore.update(id, body)
    
    if (!level) {
      return NextResponse.json(
        { error: 'Severity level not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ level })
  } catch (error) {
    console.error('Failed to update severity level:', error)
    const message = error instanceof Error ? error.message : 'Failed to update severity level'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE - Delete a severity level
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const success = severityLevelStore.delete(id)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Severity level not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete severity level:', error)
    const message = error instanceof Error ? error.message : 'Failed to delete severity level'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
