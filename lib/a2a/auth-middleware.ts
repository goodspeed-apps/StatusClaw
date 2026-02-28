/**
 * A2A Authentication Middleware
 * Validates agent authentication for API routes
 */

import { NextRequest } from 'next/server'
import { getAgentPublicKey, verifySignedMessage } from './crypto'
import { isNonceUsed, useNonce } from './nonce-cache'
import { getAgentRole, validateAuthorization, AgentRole } from './authorization'
import { logAuthFailure, logAuthSuccess } from './audit-logger'

export interface AuthResult {
  authorized: boolean
  agentId?: string
  role?: AgentRole
  error?: string
  correlationId: string
}

export interface AuthHeaders {
  'x-agent-id': string
  'x-timestamp': string
  'x-nonce': string
  'x-signature': string
  'x-correlation-id': string
}

/**
 * Middleware to require A2A authentication
 * Call this at the start of protected API routes
 */
export async function requireAuth(
  request: NextRequest,
  allowedRoles?: AgentRole[]
): Promise<AuthResult> {
  const startTime = Date.now()
  const correlationId = request.headers.get('x-correlation-id') || `req_${Date.now()}`

  try {
    // Extract auth headers
    const agentId = request.headers.get('x-agent-id')
    const timestamp = request.headers.get('x-timestamp')
    const nonce = request.headers.get('x-nonce')
    const signature = request.headers.get('x-signature')

    // Validate required headers
    if (!agentId || !timestamp || !nonce || !signature) {
      const missing = []
      if (!agentId) missing.push('x-agent-id')
      if (!timestamp) missing.push('x-timestamp')
      if (!nonce) missing.push('x-nonce')
      if (!signature) missing.push('x-signature')

      await logAuthFailure(
        agentId || 'unknown',
        'api',
        'authenticate',
        correlationId,
        'missing_headers',
        Date.now() - startTime
      )

      return {
        authorized: false,
        correlationId,
        error: `Missing authentication headers: ${missing.join(', ')}`
      }
    }

    // Get agent's public key
    const publicKey = await getAgentPublicKey(agentId)
    if (!publicKey) {
      await logAuthFailure(
        agentId,
        'api',
        'authenticate',
        correlationId,
        'agent_not_found',
        Date.now() - startTime
      )

      return {
        authorized: false,
        agentId,
        correlationId,
        error: 'Agent not registered or key revoked'
      }
    }

    // Build payload for verification
    const payload = {
      from: agentId,
      to: 'api',
      type: 'AUTH',
      payload: {
        method: request.method,
        path: request.nextUrl.pathname,
        query: request.nextUrl.search
      },
      timestamp,
      nonce
    }

    // Verify signature
    const verifyResult = verifySignedMessage(
      { ...payload, signature },
      publicKey,
      { maxAgeMs: 300000, verifyTimestamp: true }
    )

    if (!verifyResult.valid) {
      await logAuthFailure(
        agentId,
        'api',
        'authenticate',
        correlationId,
        verifyResult.error || 'invalid_signature',
        Date.now() - startTime
      )

      return {
        authorized: false,
        agentId,
        correlationId,
        error: `Authentication failed: ${verifyResult.error}`
      }
    }

    // Check nonce for replay protection
    if (isNonceUsed(nonce)) {
      await logAuthFailure(
        agentId,
        'api',
        'authenticate',
        correlationId,
        'nonce_reused',
        Date.now() - startTime
      )

      return {
        authorized: false,
        agentId,
        correlationId,
        error: 'Nonce already used (replay attack detected)'
      }
    }

    // Record nonce usage
    useNonce(nonce, agentId)

    // Check role authorization
    const role = getAgentRole(agentId)
    if (allowedRoles && !allowedRoles.includes(role)) {
      await logAuthFailure(
        agentId,
        'api',
        'authorize',
        correlationId,
        'insufficient_permissions',
        Date.now() - startTime
      )

      return {
        authorized: false,
        agentId,
        role,
        correlationId,
        error: `Role ${role} not authorized for this endpoint`
      }
    }

    // Log success
    await logAuthSuccess(
      agentId,
      'api',
      'authenticate',
      correlationId,
      Date.now() - startTime
    )

    return {
      authorized: true,
      agentId,
      role,
      correlationId
    }
  } catch (error) {
    const errorCode = error instanceof Error ? error.message : 'unknown_error'
    
    await logAuthFailure(
      'unknown',
      'api',
      'authenticate',
      correlationId,
      errorCode,
      Date.now() - startTime
    )

    return {
      authorized: false,
      correlationId,
      error: 'Authentication system error'
    }
  }
}

/**
 * Validate that the authenticated agent can perform an action
 */
export async function requireAction(
  authResult: AuthResult,
  action: string,
  targetAgentId?: string
): Promise<AuthResult> {
  if (!authResult.authorized) return authResult

  const validation = validateAuthorization(
    authResult.agentId!,
    targetAgentId || 'api',
    'COMMAND',
    action as any
  )

  if (!validation.authorized) {
    await logAuthFailure(
      authResult.agentId!,
      targetAgentId || 'api',
      action,
      authResult.correlationId,
      'unauthorized_action',
      0
    )

    return {
      ...authResult,
      authorized: false,
      error: validation.reason || 'Action not permitted'
    }
  }

  return authResult
}
