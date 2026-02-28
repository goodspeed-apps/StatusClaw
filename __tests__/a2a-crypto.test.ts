import { describe, it, expect } from 'vitest'
import {
  generateKeyPair,
  signMessage,
  verifyMessage,
  canonicalizePayload,
  generateNonce,
  generateUUID,
  hashValue,
  createSignedMessage,
  verifySignedMessage
} from '@/lib/a2a/crypto'

describe('A2A Crypto', () => {
  describe('Key Generation', () => {
    it('should generate a valid Ed25519 key pair', () => {
      const keyPair = generateKeyPair()
      
      expect(keyPair).toHaveProperty('publicKey')
      expect(keyPair).toHaveProperty('privateKey')
      expect(typeof keyPair.publicKey).toBe('string')
      expect(typeof keyPair.privateKey).toBe('string')
      expect(keyPair.publicKey.length).toBeGreaterThan(0)
      expect(keyPair.privateKey.length).toBeGreaterThan(0)
    })

    it('should generate unique key pairs each time', () => {
      const keyPair1 = generateKeyPair()
      const keyPair2 = generateKeyPair()
      
      expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey)
      expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey)
    })
  })

  describe('Canonicalization', () => {
    it('should produce deterministic output', () => {
      const payload = {
        from: 'agent1',
        to: 'agent2',
        type: 'COMMAND',
        payload: { action: 'test' },
        timestamp: '2026-02-28T12:00:00Z',
        nonce: 'abc123'
      }
      
      const canonical1 = canonicalizePayload(payload)
      const canonical2 = canonicalizePayload(payload)
      
      expect(canonical1).toBe(canonical2)
    })

    it('should produce same output regardless of key order', () => {
      const payload1 = {
        from: 'agent1',
        to: 'agent2',
        type: 'COMMAND',
        payload: { action: 'test' },
        timestamp: '2026-02-28T12:00:00Z',
        nonce: 'abc123'
      }
      
      const payload2 = {
        to: 'agent2',
        from: 'agent1',
        nonce: 'abc123',
        timestamp: '2026-02-28T12:00:00Z',
        type: 'COMMAND',
        payload: { action: 'test' }
      }
      
      const canonical1 = canonicalizePayload(payload1)
      const canonical2 = canonicalizePayload(payload2)
      
      expect(canonical1).toBe(canonical2)
    })
  })

  describe('Signing and Verification', () => {
    it('should sign and verify a message successfully', () => {
      const keyPair = generateKeyPair()
      const payload = {
        from: 'agent1',
        to: 'agent2',
        type: 'COMMAND',
        payload: { action: 'test' },
        timestamp: '2026-02-28T12:00:00Z',
        nonce: 'abc123'
      }
      
      const signature = signMessage(payload, keyPair.privateKey)
      const isValid = verifyMessage(payload, signature, keyPair.publicKey)
      
      expect(isValid).toBe(true)
    })

    it('should reject invalid signature', () => {
      const keyPair = generateKeyPair()
      const wrongKeyPair = generateKeyPair()
      
      const payload = {
        from: 'agent1',
        to: 'agent2',
        type: 'COMMAND',
        payload: { action: 'test' },
        timestamp: '2026-02-28T12:00:00Z',
        nonce: 'abc123'
      }
      
      const signature = signMessage(payload, keyPair.privateKey)
      const isValid = verifyMessage(payload, signature, wrongKeyPair.publicKey)
      
      expect(isValid).toBe(false)
    })

    it('should reject tampered message', () => {
      const keyPair = generateKeyPair()
      
      const payload = {
        from: 'agent1',
        to: 'agent2',
        type: 'COMMAND',
        payload: { action: 'test' },
        timestamp: '2026-02-28T12:00:00Z',
        nonce: 'abc123'
      }
      
      const signature = signMessage(payload, keyPair.privateKey)
      
      // Tamper with payload
      const tamperedPayload = { ...payload, type: 'MALICIOUS' }
      const isValid = verifyMessage(tamperedPayload, signature, keyPair.publicKey)
      
      expect(isValid).toBe(false)
    })
  })

  describe('Create and Verify Signed Message', () => {
    it('should create a complete signed message', async () => {
      const keyPair = generateKeyPair()
      
      const message = await createSignedMessage(
        'agent1',
        'agent2',
        'COMMAND',
        { action: 'test' },
        keyPair.privateKey
      )
      
      expect(message).toHaveProperty('from', 'agent1')
      expect(message).toHaveProperty('to', 'agent2')
      expect(message).toHaveProperty('type', 'COMMAND')
      expect(message).toHaveProperty('payload', { action: 'test' })
      expect(message).toHaveProperty('timestamp')
      expect(message).toHaveProperty('nonce')
      expect(message).toHaveProperty('signature')
      expect(message.nonce).toHaveLength(32) // 16 bytes hex
    })

    it('should verify a complete signed message', async () => {
      const keyPair = generateKeyPair()
      
      const message = await createSignedMessage(
        'agent1',
        'agent2',
        'COMMAND',
        { action: 'test' },
        keyPair.privateKey
      )
      
      const result = verifySignedMessage(message, keyPair.publicKey)
      
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject expired message', async () => {
      const keyPair = generateKeyPair()
      
      // Create a message with old timestamp
      const message = {
        from: 'agent1',
        to: 'agent2',
        type: 'COMMAND',
        payload: { action: 'test' },
        timestamp: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        nonce: await generateNonce(),
        signature: ''
      }
      
      message.signature = signMessage(message, keyPair.privateKey)
      
      const result = verifySignedMessage(message, keyPair.publicKey)
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('message_expired')
    })
  })

  describe('Utility Functions', () => {
    it('should generate unique nonces', async () => {
      const nonce1 = await generateNonce()
      const nonce2 = await generateNonce()
      
      expect(nonce1).not.toBe(nonce2)
      expect(nonce1).toHaveLength(32)
      expect(nonce2).toHaveLength(32)
    })

    it('should generate valid UUIDs', () => {
      const uuid = generateUUID()
      
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })

    it('should produce consistent hashes', () => {
      const input = 'test_input'
      const hash1 = hashValue(input)
      const hash2 = hashValue(input)
      
      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(64) // SHA-256 hex
    })

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashValue('input1')
      const hash2 = hashValue('input2')
      
      expect(hash1).not.toBe(hash2)
    })
  })
})
