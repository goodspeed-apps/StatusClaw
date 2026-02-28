/**
 * A2A Key Registry
 * Manages agent public keys and provides lookup/validation
 */

import { readFile, writeFile, mkdir, access } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import { hashValue } from './crypto'

// Types
export interface AgentKeyEntry {
  agentId: string
  publicKey: string      // base64 PEM
  keyFingerprint: string // SHA-256 hash of public key
  createdAt: string      // ISO 8601
  expiresAt?: string     // ISO 8601 (optional rotation)
  revokedAt?: string     // ISO 8601 (if revoked)
  metadata?: {
    role?: string
    version?: string
  }
}

export interface KeyRegistry {
  version: number
  lastUpdated: string
  agents: Record<string, AgentKeyEntry>
}

// Configuration
const KEY_REGISTRY_PATH = process.env.A2A_KEY_REGISTRY || 
  join(homedir(), '.openclaw', 'keys', 'registry.json')

const KEYS_DIR = process.env.A2A_KEYS_DIR || 
  join(homedir(), '.openclaw', 'keys')

// In-memory cache
let registryCache: KeyRegistry | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 5000 // 5 second cache

/**
 * Get the default key storage path for an agent
 */
export function getAgentKeyPath(agentId: string): string {
  return join(KEYS_DIR, `${agentId}.key`)
}

export function getAgentPublicKeyPath(agentId: string): string {
  return join(KEYS_DIR, `${agentId}.pub`)
}

/**
 * Ensure keys directory exists
 */
async function ensureKeysDir(): Promise<void> {
  try {
    await access(KEYS_DIR)
  } catch {
    await mkdir(KEYS_DIR, { recursive: true, mode: 0o700 })
  }
}

/**
 * Load the key registry
 */
export async function loadRegistry(): Promise<KeyRegistry> {
  // Check cache
  const now = Date.now()
  if (registryCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return registryCache
  }

  try {
    const data = await readFile(KEY_REGISTRY_PATH, 'utf-8')
    const registry: KeyRegistry = JSON.parse(data)
    registryCache = registry
    cacheTimestamp = now
    return registry
  } catch (error) {
    // Return empty registry if file doesn't exist
    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      agents: {}
    }
  }
}

/**
 * Save the key registry
 */
export async function saveRegistry(registry: KeyRegistry): Promise<void> {
  await ensureKeysDir()
  registry.lastUpdated = new Date().toISOString()
  const data = JSON.stringify(registry, null, 2)
  await writeFile(KEY_REGISTRY_PATH, data, { mode: 0o600 })
  registryCache = registry
  cacheTimestamp = Date.now()
}

/**
 * Register an agent's public key
 */
export async function registerAgentKey(
  agentId: string,
  publicKey: string,
  metadata?: AgentKeyEntry['metadata']
): Promise<AgentKeyEntry> {
  const registry = await loadRegistry()

  const entry: AgentKeyEntry = {
    agentId,
    publicKey,
    keyFingerprint: hashValue(publicKey),
    createdAt: new Date().toISOString(),
    metadata
  }

  registry.agents[agentId] = entry
  await saveRegistry(registry)

  return entry
}

/**
 * Get an agent's public key by ID
 */
export async function getAgentPublicKey(agentId: string): Promise<string | null> {
  const registry = await loadRegistry()
  const entry = registry.agents[agentId]
  
  if (!entry || entry.revokedAt) {
    return null
  }

  return entry.publicKey
}

/**
 * Get full agent key entry
 */
export async function getAgentKeyEntry(agentId: string): Promise<AgentKeyEntry | null> {
  const registry = await loadRegistry()
  const entry = registry.agents[agentId]
  
  if (!entry || entry.revokedAt) {
    return null
  }

  return entry
}

/**
 * Check if agent key is valid (exists and not revoked)
 */
export async function isAgentKeyValid(agentId: string): Promise<boolean> {
  const entry = await getAgentKeyEntry(agentId)
  return entry !== null
}

/**
 * Revoke an agent's key
 */
export async function revokeAgentKey(agentId: string): Promise<boolean> {
  const registry = await loadRegistry()
  const entry = registry.agents[agentId]

  if (!entry) {
    return false
  }

  entry.revokedAt = new Date().toISOString()
  await saveRegistry(registry)
  return true
}

/**
 * List all registered agents
 */
export async function listRegisteredAgents(): Promise<AgentKeyEntry[]> {
  const registry = await loadRegistry()
  return Object.values(registry.agents).filter(
    entry => !entry.revokedAt
  )
}

/**
 * List revoked agents
 */
export async function listRevokedAgents(): Promise<AgentKeyEntry[]> {
  const registry = await loadRegistry()
  return Object.values(registry.agents).filter(
    entry => entry.revokedAt
  )
}

/**
 * Verify key fingerprint matches
 */
export async function verifyKeyFingerprint(
  agentId: string,
  fingerprint: string
): Promise<boolean> {
  const entry = await getAgentKeyEntry(agentId)
  if (!entry) return false
  return entry.keyFingerprint === fingerprint
}

/**
 * Rotate an agent's key (revoke old, register new)
 */
export async function rotateAgentKey(
  agentId: string,
  newPublicKey: string,
  metadata?: AgentKeyEntry['metadata']
): Promise<AgentKeyEntry> {
  const registry = await loadRegistry()
  const existingEntry = registry.agents[agentId]

  // Mark old key as expired if it exists
  if (existingEntry && !existingEntry.revokedAt) {
    existingEntry.expiresAt = new Date().toISOString()
  }

  // Register new key
  const newEntry: AgentKeyEntry = {
    agentId,
    publicKey: newPublicKey,
    keyFingerprint: hashValue(newPublicKey),
    createdAt: new Date().toISOString(),
    metadata
  }

  registry.agents[agentId] = newEntry
  await saveRegistry(registry)

  return newEntry
}

/**
 * Initialize key storage for an agent (save keys to disk)
 */
export async function initializeAgentKeys(
  agentId: string,
  keyPair: { publicKey: string; privateKey: string }
): Promise<void> {
  await ensureKeysDir()

  const privateKeyPath = getAgentKeyPath(agentId)
  const publicKeyPath = getAgentKeyPath(agentId)

  // Write keys with restrictive permissions
  await writeFile(privateKeyPath, keyPair.privateKey, { mode: 0o600 })
  await writeFile(publicKeyPath, keyPair.publicKey, { mode: 0o644 })

  // Register in registry
  await registerAgentKey(agentId, keyPair.publicKey)
}
