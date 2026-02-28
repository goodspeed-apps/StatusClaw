/**
 * A2A Key Management API
 * Manage agent public keys in the registry
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  registerAgentKey,
  getAgentPublicKey,
  listRegisteredAgents,
  listRevokedAgents,
  revokeAgentKey,
  rotateAgentKey,
  generateKeyPair
} from '@/lib/a2a'
import { requireAuth, requireAction } from '@/lib/a2a/auth-middleware'

export const dynamic = 'force-dynamic'

/**
 * GET /api/a2a/keys
 * List all registered keys
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

    const { searchParams } = new URL(request.url)
    const includeRevoked = searchParams.get('includeRevoked') === 'true'

    const [active, revoked] = await Promise.all([
      listRegisteredAgents(),
      includeRevoked ? listRevokedAgents() : Promise.resolve([])
    ])

    return NextResponse.json({
      success: true,
      data: {
        active,
        revoked: includeRevoked ? revoked : undefined,
        total: active.length + revoked.length
      }
    })
  } catch (error) {
    console.error('[A2A Keys API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to list keys' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/a2a/keys
 * Register a new agent key or rotate existing
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth(request, ['orchestrator'])
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { agentId, publicKey, action, metadata } = body

    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing agentId' },
        { status: 400 }
      )
    }

    // Handle key generation request
    if (action === 'generate') {
      const keyPair = generateKeyPair()
      const entry = await registerAgentKey(agentId, keyPair.publicKey, metadata)
      
      return NextResponse.json({
        success: true,
        data: {
          agentId,
          entry,
          // Return private key only on generation - it won't be stored!
          privateKey: keyPair.privateKey
        },
        warning: 'Store the privateKey securely. It will not be shown again.'
      })
    }

    // Handle rotation
    if (action === 'rotate') {
      if (!publicKey) {
        return NextResponse.json(
          { error: 'Missing publicKey for rotation' },
          { status: 400 }
        )
      }

      const entry = await rotateAgentKey(agentId, publicKey, metadata)
      
      return NextResponse.json({
        success: true,
        data: { agentId, entry }
      })
    }

    // Handle standard registration
    if (!publicKey) {
      return NextResponse.json(
        { error: 'Missing publicKey' },
        { status: 400 }
      )
    }

    const entry = await registerAgentKey(agentId, publicKey, metadata)

    return NextResponse.json({
      success: true,
      data: { agentId, entry }
    })
  } catch (error) {
    console.error('[A2A Keys API] Registration error:', error)
    return NextResponse.json(
      { error: 'Failed to register key' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/a2a/keys
 * Revoke an agent's key
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication and action permission
    let authResult = await requireAuth(request, ['orchestrator', 'security'])
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }

    // Require specific permission for key revocation
    authResult = await requireAction(authResult, 'key:revoke')
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')

    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing agentId' },
        { status: 400 }
      )
    }

    const revoked = await revokeAgentKey(agentId)
    
    if (!revoked) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { agentId, revoked: true }
    })
  } catch (error) {
    console.error('[A2A Keys API] Revocation error:', error)
    return NextResponse.json(
      { error: 'Failed to revoke key' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/a2a/keys/:agentId
 * Get a specific agent's public key
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, ['security', 'orchestrator'])
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')

    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing agentId' },
        { status: 400 }
      )
    }

    const publicKey = await getAgentPublicKey(agentId)
    
    if (!publicKey) {
      return NextResponse.json(
        { error: 'Agent key not found or revoked' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { agentId, publicKey }
    })
  } catch (error) {
    console.error('[A2A Keys API] Get key error:', error)
    return NextResponse.json(
      { error: 'Failed to get key' },
      { status: 500 }
    )
  }
}
