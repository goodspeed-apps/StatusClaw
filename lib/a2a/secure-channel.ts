/**
 * A2A Secure Channel
 * Manages authenticated, encrypted communication between agents
 */

import { generateUUID, createSignedMessage, verifySignedMessage, SignedMessage } from './crypto'
import { getAgentPublicKey } from './key-registry'
import { isNonceUsed, useNonce } from './nonce-cache'
import { logAuthSuccess, logAuthFailure, logMessageDelivery } from './audit-logger'
import { AgentRole, hasCapability, CAPABILITIES_BY_ROLE } from './authorization'

// Types
export type MessageType = 'COMMAND' | 'QUERY' | 'RESPONSE' | 'EVENT' | 'AUTH'

export interface SecureMessage<T = unknown> {
  from: string
  to: string
  type: MessageType
  payload: T
  timestamp: string
  nonce: string
  signature: string
  correlationId: string
}

export interface SecureChannelConfig {
  agentId: string
  privateKey: string
  role: AgentRole
  timeoutMs?: number
}

export interface SendOptions {
  timeoutMs?: number
  requireResponse?: boolean
}

export interface ChannelStats {
  messagesSent: number
  messagesReceived: number
  authFailures: number
  lastActivity: Date | null
}

// Configuration
const DEFAULT_TIMEOUT_MS = 30000
const MAX_MESSAGE_SIZE = 1024 * 1024 // 1MB

/**
 * Secure Channel for A2A communication
 */
export class SecureChannel {
  private config: SecureChannelConfig
  private stats: ChannelStats = {
    messagesSent: 0,
    messagesReceived: 0,
    authFailures: 0,
    lastActivity: null
  }

  constructor(config: SecureChannelConfig) {
    this.config = {
      timeoutMs: DEFAULT_TIMEOUT_MS,
      ...config
    }
  }

  /**
   * Send a message to another agent
   */
  async send<T = unknown, R = unknown>(
    targetAgentId: string,
    type: MessageType,
    payload: T,
    options: SendOptions = {}
  ): Promise<SecureMessage<R> | null> {
    const { timeoutMs = this.config.timeoutMs, requireResponse = false } = options
    const correlationId = generateUUID()
    const startTime = Date.now()

    try {
      // Validate message size
      const payloadSize = JSON.stringify(payload).length
      if (payloadSize > MAX_MESSAGE_SIZE) {
        throw new Error('message_too_large')
      }

      // Check capability
      if (!hasCapability(this.config.role, type, payload)) {
        await logAuthFailure(
          this.config.agentId,
          targetAgentId,
          'send',
          correlationId,
          'unauthorized',
          Date.now() - startTime
        )
        throw new Error('unauthorized')
      }

      // Create signed message
      const signedMessage = await createSignedMessage(
        this.config.agentId,
        targetAgentId,
        type,
        payload,
        this.config.privateKey
      )

      // Build full secure message
      const message: SecureMessage<T> = {
        ...signedMessage,
        correlationId
      }

      // In a real implementation, this would send over HTTP/gRPC/nats
      // For now, we return the message structure
      this.stats.messagesSent++
      this.stats.lastActivity = new Date()

      await logMessageDelivery(
        this.config.agentId,
        targetAgentId,
        type,
        correlationId,
        true,
        Date.now() - startTime
      )

      return message as SecureMessage<R>
    } catch (error) {
      const errorCode = error instanceof Error ? error.message : 'unknown_error'
      await logMessageDelivery(
        this.config.agentId,
        targetAgentId,
        type,
        correlationId,
        false,
        Date.now() - startTime,
        errorCode
      )
      throw error
    }
  }

  /**
   * Receive and verify a message from another agent
   */
  async receive<T = unknown>(
    message: SecureMessage<T>,
    context?: {
      sourceIp?: string
      socketPath?: string
    }
  ): Promise<{ valid: boolean; error?: string; data?: T }> {
    const startTime = Date.now()

    try {
      // Get sender's public key
      const publicKey = await getAgentPublicKey(message.from)
      if (!publicKey) {
        await logAuthFailure(
          message.from,
          this.config.agentId,
          'receive',
          message.correlationId,
          'agent_not_found',
          Date.now() - startTime,
          context
        )
        this.stats.authFailures++
        return { valid: false, error: 'agent_not_found' }
      }

      // Verify signature
      const verifyResult = verifySignedMessage(
        {
          from: message.from,
          to: message.to,
          type: message.type,
          payload: message.payload,
          timestamp: message.timestamp,
          nonce: message.nonce,
          signature: message.signature
        },
        publicKey,
        { maxAgeMs: 300000, verifyTimestamp: true }
      )

      if (!verifyResult.valid) {
        await logAuthFailure(
          message.from,
          this.config.agentId,
          'receive',
          message.correlationId,
          verifyResult.error || 'invalid_signature',
          Date.now() - startTime,
          context
        )
        this.stats.authFailures++
        return { valid: false, error: verifyResult.error }
      }

      // Check nonce for replay protection
      if (isNonceUsed(message.nonce)) {
        await logAuthFailure(
          message.from,
          this.config.agentId,
          'receive',
          message.correlationId,
          'nonce_reused',
          Date.now() - startTime,
          context
        )
        this.stats.authFailures++
        return { valid: false, error: 'nonce_reused' }
      }

      // Record nonce usage
      useNonce(message.nonce, message.from)

      // Check destination
      if (message.to !== this.config.agentId) {
        await logAuthFailure(
          message.from,
          this.config.agentId,
          'receive',
          message.correlationId,
          'wrong_recipient',
          Date.now() - startTime,
          context
        )
        return { valid: false, error: 'wrong_recipient' }
      }

      // Log success
      await logAuthSuccess(
        message.from,
        this.config.agentId,
        'receive',
        message.correlationId,
        Date.now() - startTime,
        context
      )

      this.stats.messagesReceived++
      this.stats.lastActivity = new Date()

      return { valid: true, data: message.payload }
    } catch (error) {
      const errorCode = error instanceof Error ? error.message : 'unknown_error'
      await logAuthFailure(
        message.from,
        this.config.agentId,
        'receive',
        message.correlationId,
        errorCode,
        Date.now() - startTime,
        context
      )
      this.stats.authFailures++
      return { valid: false, error: errorCode }
    }
  }

  /**
   * Verify agent identity without processing a message
   */
  async verifyAgent(agentId: string): Promise<boolean> {
    const publicKey = await getAgentPublicKey(agentId)
    return publicKey !== null
  }

  /**
   * Get channel statistics
   */
  getStats(): ChannelStats {
    return { ...this.stats }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      authFailures: 0,
      lastActivity: null
    }
  }
}

/**
 * Factory function to create a secure channel
 */
export async function createSecureChannel(
  config: SecureChannelConfig
): Promise<SecureChannel> {
  // Validate the agent has a key pair
  const publicKey = await getAgentPublicKey(config.agentId)
  if (!publicKey) {
    throw new Error(`No public key found for agent: ${config.agentId}`)
  }

  return new SecureChannel(config)
}

/**
 * Quick send function for simple use cases
 */
export async function sendSecureMessage<T = unknown, R = unknown>(
  fromAgentId: string,
  toAgentId: string,
  privateKey: string,
  type: MessageType,
  payload: T,
  role: AgentRole = 'executor'
): Promise<SecureMessage<R> | null> {
  const channel = new SecureChannel({
    agentId: fromAgentId,
    privateKey,
    role
  })

  return channel.send(toAgentId, type, payload)
}

/**
 * Quick receive function for simple use cases
 */
export async function receiveSecureMessage<T = unknown>(
  agentId: string,
  privateKey: string,
  message: SecureMessage<T>,
  role: AgentRole = 'executor',
  context?: { sourceIp?: string; socketPath?: string }
): Promise<{ valid: boolean; error?: string; data?: T }> {
  const channel = new SecureChannel({
    agentId,
    privateKey,
    role
  })

  return channel.receive(message, context)
}
