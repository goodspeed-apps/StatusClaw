import { describe, it, expect, beforeEach } from 'vitest'
import {
  SecureChannel,
  createSecureChannel,
  sendSecureMessage,
  receiveSecureMessage,
  clearNonceCache,
  registerAgentKey,
  generateKeyPair
} from '@/lib/a2a'
import type { AgentRole } from '@/lib/a2a'

describe('A2A Secure Channel', () => {
  let atlasKeyPair: { publicKey: string; privateKey: string }
  let backendKeyPair: { publicKey: string; privateKey: string }

  beforeEach(async () => {
    // Clear nonce cache before each test
    clearNonceCache()
    
    // Generate key pairs
    atlasKeyPair = generateKeyPair()
    backendKeyPair = generateKeyPair()
    
    // Register keys
    await registerAgentKey('atlas', atlasKeyPair.publicKey, { role: 'orchestrator' })
    await registerAgentKey('backend_eng', backendKeyPair.publicKey, { role: 'executor' })
  })

  describe('Channel Creation', () => {
    it('should create a secure channel for registered agent', async () => {
      const channel = await createSecureChannel({
        agentId: 'atlas',
        privateKey: atlasKeyPair.privateKey,
        role: 'orchestrator'
      })
      
      expect(channel).toBeInstanceOf(SecureChannel)
    })

    it('should throw error for unregistered agent', async () => {
      await expect(createSecureChannel({
        agentId: 'unknown_agent',
        privateKey: atlasKeyPair.privateKey,
        role: 'orchestrator'
      })).rejects.toThrow('No public key found for agent')
    })
  })

  describe('Message Sending', () => {
    it('should create a signed message', async () => {
      const channel = await createSecureChannel({
        agentId: 'atlas',
        privateKey: atlasKeyPair.privateKey,
        role: 'orchestrator'
      })
      
      const message = await channel.send('backend_eng', 'COMMAND', {
        task: 'deploy',
        target: 'production'
      })
      
      expect(message).not.toBeNull()
      expect(message?.from).toBe('atlas')
      expect(message?.to).toBe('backend_eng')
      expect(message?.type).toBe('COMMAND')
      expect(message?.payload).toEqual({ task: 'deploy', target: 'production' })
      expect(message?.signature).toBeDefined()
      expect(message?.correlationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })

    it('should enforce capability restrictions', async () => {
      // Create observer-level channel
      await registerAgentKey('cfo', generateKeyPair().publicKey, { role: 'observer' })
      const cfoKeyPair = generateKeyPair()
      await registerAgentKey('cfo', cfoKeyPair.publicKey) // Update with new key
      
      const channel = await createSecureChannel({
        agentId: 'cfo',
        privateKey: cfoKeyPair.privateKey,
        role: 'observer'
      })
      
      // Observer should not be able to send COMMAND
      await expect(channel.send('backend_eng', 'COMMAND', {
        task: 'deploy'
      })).rejects.toThrow('unauthorized')
    })
  })

  describe('Message Receiving', () => {
    it('should verify and accept valid message', async () => {
      const channel = await createSecureChannel({
        agentId: 'backend_eng',
        privateKey: backendKeyPair.privateKey,
        role: 'executor'
      })
      
      // Create a message from atlas
      const sentMessage = await sendSecureMessage(
        'atlas',
        'backend_eng',
        atlasKeyPair.privateKey,
        'COMMAND',
        { task: 'test' },
        'orchestrator'
      )
      
      if (!sentMessage) {
        throw new Error('Failed to create test message')
      }
      
      // Verify it
      const result = await channel.receive(sentMessage)
      
      expect(result.valid).toBe(true)
      expect(result.data).toEqual({ task: 'test' })
      expect(result.error).toBeUndefined()
    })

    it('should reject message with invalid signature', async () => {
      const channel = await createSecureChannel({
        agentId: 'backend_eng',
        privateKey: backendKeyPair.privateKey,
        role: 'executor'
      })
      
      // Create a tampered message
      const tamperedMessage = {
        from: 'atlas',
        to: 'backend_eng',
        type: 'COMMAND' as const,
        payload: { task: 'test' },
        timestamp: new Date().toISOString(),
        nonce: '1234567890abcdef',
        signature: 'invalid_signature',
        correlationId: 'test-correlation-id'
      }
      
      const result = await channel.receive(tamperedMessage)
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('invalid_signature')
    })

    it('should reject replayed message', async () => {
      const channel = await createSecureChannel({
        agentId: 'backend_eng',
        privateKey: backendKeyPair.privateKey,
        role: 'executor'
      })
      
      // Create a valid message
      const sentMessage = await sendSecureMessage(
        'atlas',
        'backend_eng',
        atlasKeyPair.privateKey,
        'COMMAND',
        { task: 'test' },
        'orchestrator'
      )
      
      if (!sentMessage) {
        throw new Error('Failed to create test message')
      }
      
      // First receive should succeed
      const result1 = await channel.receive(sentMessage)
      expect(result1.valid).toBe(true)
      
      // Second receive (replay) should fail
      const result2 = await channel.receive(sentMessage)
      expect(result2.valid).toBe(false)
      expect(result2.error).toBe('nonce_reused')
    })

    it('should reject message for wrong recipient', async () => {
      const channel = await createSecureChannel({
        agentId: 'backend_eng',
        privateKey: backendKeyPair.privateKey,
        role: 'executor'
      })
      
      // Create message addressed to someone else
      const sentMessage = await sendSecureMessage(
        'atlas',
        'web_eng', // Different target
        atlasKeyPair.privateKey,
        'COMMAND',
        { task: 'test' },
        'orchestrator'
      )
      
      if (!sentMessage) {
        throw new Error('Failed to create test message')
      }
      
      const result = await channel.receive(sentMessage)
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('wrong_recipient')
    })
  })

  describe('Channel Statistics', () => {
    it('should track message statistics', async () => {
      const channel = await createSecureChannel({
        agentId: 'atlas',
        privateKey: atlasKeyPair.privateKey,
        role: 'orchestrator'
      })
      
      // Initial stats
      const initialStats = channel.getStats()
      expect(initialStats.messagesSent).toBe(0)
      expect(initialStats.messagesReceived).toBe(0)
      expect(initialStats.authFailures).toBe(0)
      
      // Send a message
      await channel.send('backend_eng', 'COMMAND', { task: 'test' })
      
      const updatedStats = channel.getStats()
      expect(updatedStats.messagesSent).toBe(1)
      expect(updatedStats.lastActivity).not.toBeNull()
    })

    it('should reset statistics', async () => {
      const channel = await createSecureChannel({
        agentId: 'atlas',
        privateKey: atlasKeyPair.privateKey,
        role: 'orchestrator'
      })
      
      await channel.send('backend_eng', 'COMMAND', { task: 'test' })
      channel.resetStats()
      
      const stats = channel.getStats()
      expect(stats.messagesSent).toBe(0)
      expect(stats.messagesReceived).toBe(0)
      expect(stats.authFailures).toBe(0)
      expect(stats.lastActivity).toBeNull()
    })
  })

  describe('Agent Verification', () => {
    it('should verify registered agent', async () => {
      const channel = await createSecureChannel({
        agentId: 'atlas',
        privateKey: atlasKeyPair.privateKey,
        role: 'orchestrator'
      })
      
      const isValid = await channel.verifyAgent('backend_eng')
      expect(isValid).toBe(true)
    })

    it('should reject unregistered agent', async () => {
      const channel = await createSecureChannel({
        agentId: 'atlas',
        privateKey: atlasKeyPair.privateKey,
        role: 'orchestrator'
      })
      
      const isValid = await channel.verifyAgent('unknown_agent')
      expect(isValid).toBe(false)
    })
  })
})
