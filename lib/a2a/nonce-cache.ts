/**
 * A2A Nonce Cache
 * Prevents replay attacks by tracking used nonces
 */

// Simple in-memory cache with TTL
// In production, use Redis or similar

interface NonceEntry {
  nonce: string
  timestamp: number
  usedBy: string // agent ID
}

// Configuration
const NONCE_MAX_AGE_MS = 300000 // 5 minutes
const CLEANUP_INTERVAL_MS = 60000 // 1 minute

// In-memory storage
const nonceCache = new Map<string, NonceEntry>()

// Start cleanup interval
setInterval(cleanupExpiredNonces, CLEANUP_INTERVAL_MS)

/**
 * Check if a nonce has been used
 */
export function isNonceUsed(nonce: string): boolean {
  const entry = nonceCache.get(nonce)
  if (!entry) return false

  // Check if expired
  const now = Date.now()
  if (now - entry.timestamp > NONCE_MAX_AGE_MS) {
    nonceCache.delete(nonce)
    return false
  }

  return true
}

/**
 * Mark a nonce as used
 */
export function useNonce(nonce: string, agentId: string): boolean {
  // Check if already used
  if (isNonceUsed(nonce)) {
    return false
  }

  // Store with timestamp
  nonceCache.set(nonce, {
    nonce,
    timestamp: Date.now(),
    usedBy: agentId
  })

  return true
}

/**
 * Cleanup expired nonces
 */
function cleanupExpiredNonces(): void {
  const now = Date.now()
  const expired: string[] = []

  for (const [nonce, entry] of nonceCache.entries()) {
    if (now - entry.timestamp > NONCE_MAX_AGE_MS) {
      expired.push(nonce)
    }
  }

  for (const nonce of expired) {
    nonceCache.delete(nonce)
  }

  if (expired.length > 0) {
    console.log(`[A2A] Cleaned up ${expired.length} expired nonces`)
  }
}

/**
 * Get cache statistics (for monitoring)
 */
export function getCacheStats(): {
  size: number
  oldestEntry: number | null
  newestEntry: number | null
} {
  let oldest: number | null = null
  let newest: number | null = null

  for (const entry of nonceCache.values()) {
    if (oldest === null || entry.timestamp < oldest) {
      oldest = entry.timestamp
    }
    if (newest === null || entry.timestamp > newest) {
      newest = entry.timestamp
    }
  }

  return {
    size: nonceCache.size,
    oldestEntry: oldest,
    newestEntry: newest
  }
}

/**
 * Clear all nonces (for testing)
 */
export function clearNonceCache(): void {
  nonceCache.clear()
}
