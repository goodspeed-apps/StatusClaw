/**
 * A2A Cryptography Module
 * Handles Ed25519 key operations, signatures, and verification
 */

import { randomBytes, createHash } from 'crypto'
import { promisify } from 'util'

// Use Node.js built-in crypto for Ed25519 (Node 18+)
import { generateKeyPairSync, sign, verify } from 'crypto'

const randomBytesAsync = promisify(randomBytes)

// Types
export interface KeyPair {
  publicKey: string  // base64
  privateKey: string // base64
}

export interface SignedMessage {
  from: string
  to: string
  type: string
  payload: unknown
  timestamp: string
  nonce: string
  signature: string // base64
}

export interface MessagePayload {
  from: string
  to: string
  type: string
  payload: unknown
  timestamp: string
  nonce: string
}

/**
 * Generate a new Ed25519 key pair for an agent
 */
export function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  })

  // Convert PEM to base64 for storage
  const publicKeyBase64 = Buffer.from(publicKey).toString('base64')
  const privateKeyBase64 = Buffer.from(privateKey).toString('base64')

  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64
  }
}

/**
 * Canonicalize payload for signing (deterministic JSON)
 */
export function canonicalizePayload(payload: MessagePayload): string {
  // Sort keys recursively for deterministic output
  const sorted = sortKeys(payload)
  return JSON.stringify(sorted)
}

function sortKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(sortKeys)
  }

  const sorted: Record<string, unknown> = {}
  const keys = Object.keys(obj as Record<string, unknown>).sort()
  for (const key of keys) {
    sorted[key] = sortKeys((obj as Record<string, unknown>)[key])
  }
  return sorted
}

/**
 * Sign a message with Ed25519
 */
export function signMessage(
  payload: MessagePayload,
  privateKeyBase64: string
): string {
  const privateKeyPem = Buffer.from(privateKeyBase64, 'base64').toString('utf-8')
  const canonical = canonicalizePayload(payload)
  const signature = sign(null, Buffer.from(canonical), privateKeyPem)
  return signature.toString('base64')
}

/**
 * Verify a message signature
 */
export function verifyMessage(
  payload: MessagePayload,
  signatureBase64: string,
  publicKeyBase64: string
): boolean {
  try {
    const publicKeyPem = Buffer.from(publicKeyBase64, 'base64').toString('utf-8')
    const canonical = canonicalizePayload(payload)
    const signature = Buffer.from(signatureBase64, 'base64')
    return verify(null, Buffer.from(canonical), publicKeyPem, signature)
  } catch {
    return false
  }
}

/**
 * Generate a cryptographically secure nonce
 */
export async function generateNonce(): Promise<string> {
  const bytes = await randomBytesAsync(16)
  return bytes.toString('hex')
}

/**
 * Generate a UUID v4 for correlation IDs
 */
export function generateUUID(): string {
  return randomBytes(16).toString('hex').replace(
    /(.{8})(.{4})(.{4})(.{4})(.{12})/,
    '$1-$2-$3-$4-$5'
  )
}

/**
 * Hash a value using SHA-256
 */
export function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/**
 * Create a complete signed message
 */
export async function createSignedMessage(
  from: string,
  to: string,
  type: string,
  payload: unknown,
  privateKeyBase64: string
): Promise<SignedMessage> {
  const message: MessagePayload = {
    from,
    to,
    type,
    payload,
    timestamp: new Date().toISOString(),
    nonce: await generateNonce()
  }

  const signature = signMessage(message, privateKeyBase64)

  return {
    ...message,
    signature
  }
}

/**
 * Verify a complete signed message
 */
export function verifySignedMessage(
  message: SignedMessage,
  publicKeyBase64: string,
  options: {
    maxAgeMs?: number
    verifyTimestamp?: boolean
  } = {}
): { valid: boolean; error?: string } {
  const { maxAgeMs = 300000, verifyTimestamp = true } = options

  // Verify timestamp freshness
  if (verifyTimestamp) {
    const msgTime = new Date(message.timestamp).getTime()
    const now = Date.now()
    if (Math.abs(now - msgTime) > maxAgeMs) {
      return { valid: false, error: 'message_expired' }
    }
  }

  // Extract payload components for verification
  const payload: MessagePayload = {
    from: message.from,
    to: message.to,
    type: message.type,
    payload: message.payload,
    timestamp: message.timestamp,
    nonce: message.nonce
  }

  // Verify signature
  const isValid = verifyMessage(payload, message.signature, publicKeyBase64)
  if (!isValid) {
    return { valid: false, error: 'invalid_signature' }
  }

  return { valid: true }
}
