/**
 * A2A Audit Logs API
 * Query audit logs for security review
 */

import { NextRequest, NextResponse } from 'next/server'
import { queryAuditLogs, AuditQuery, verifyChecksum } from '@/lib/a2a'
import { requireAuth } from '@/lib/a2a/auth-middleware'

export const dynamic = 'force-dynamic'

/**
 * GET /api/a2a/audit
 * Query audit logs with filters
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth(request, ['security', 'orchestrator'])
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    
    const startTime = searchParams.get('startTime')
    const endTime = searchParams.get('endTime')
    const fromAgent = searchParams.get('fromAgent') || undefined
    const toAgent = searchParams.get('toAgent') || undefined
    const status = searchParams.get('status') as AuditQuery['status'] || undefined
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const cursor = searchParams.get('cursor') || undefined

    // Validate required params
    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required parameters: startTime, endTime' },
        { status: 400 }
      )
    }

    // Build query
    const query: AuditQuery = {
      startTime,
      endTime,
      fromAgent,
      toAgent,
      status,
      limit: Math.min(limit, 1000), // Max 1000 per request
      cursor
    }

    // Execute query
    const result = await queryAuditLogs(query)

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        query,
        requestedBy: authResult.agentId
      }
    })
  } catch (error) {
    console.error('[A2A Audit API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to query audit logs' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/a2a/audit/verify
 * Verify log integrity for a specific date
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth(request, ['security'])
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }

    const body = await request.json()
    const dateStr = body.date

    if (!dateStr) {
      return NextResponse.json(
        { error: 'Missing date parameter' },
        { status: 400 }
      )
    }

    const date = new Date(dateStr)
    const isValid = await verifyChecksum(date)

    return NextResponse.json({
      success: true,
      data: {
        date: dateStr,
        integrityVerified: isValid
      }
    })
  } catch (error) {
    console.error('[A2A Audit API] Verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify log integrity' },
      { status: 500 }
    )
  }
}
