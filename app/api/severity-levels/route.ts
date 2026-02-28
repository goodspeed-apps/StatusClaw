import { NextResponse } from 'next/server'
import { severityLevelStore } from '@/lib/severity-level-store'

export const dynamic = 'force-dynamic'

// GET - Fetch all severity levels
export async function GET() {
  try {
    const levels = severityLevelStore.getAll()
    return NextResponse.json({
      levels,
      count: levels.length,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch severity levels:', error)
    return NextResponse.json(
      { error: 'Failed to fetch severity levels' },
      { status: 500 }
    )
  }
}

// POST - Create a new severity level
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, slug, color, icon, order, pagesOnCall, isDefault, description } = body

    if (!name || !slug || !color) {
      return NextResponse.json(
        { error: 'Missing required fields: name, slug, color' },
        { status: 400 }
      )
    }

    const level = severityLevelStore.create({
      name,
      slug,
      color,
      icon: icon || 'alert-circle',
      order: order ?? 0,
      pagesOnCall: pagesOnCall ?? false,
      isDefault: isDefault ?? false,
      description,
    })

    return NextResponse.json({ level }, { status: 201 })
  } catch (error) {
    console.error('Failed to create severity level:', error)
    const message = error instanceof Error ? error.message : 'Failed to create severity level'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT - Reorder severity levels
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { orderedIds } = body

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: 'Missing required field: orderedIds (array)' },
        { status: 400 }
      )
    }

    const levels = severityLevelStore.reorder(orderedIds)
    return NextResponse.json({ levels })
  } catch (error) {
    console.error('Failed to reorder severity levels:', error)
    const message = error instanceof Error ? error.message : 'Failed to reorder severity levels'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
