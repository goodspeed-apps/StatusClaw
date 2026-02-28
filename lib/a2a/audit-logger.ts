/**
 * A2A Audit Logger
 * Logs all Agent-to-Agent operations for security review
 */

import { writeFile, mkdir, appendFile, access, readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { createHash } from 'crypto'

// Types
export type LogLevel = 'INFO' | 'WARN' | 'ERROR'
export type OperationStatus = 'success' | 'failure' | 'denied'

export interface A2ALogEntry {
  timestamp: string      // ISO 8601 UTC
  level: LogLevel
  correlationId: string  // UUID for request tracing
  from: string           // Source agent ID
  to: string             // Target agent ID
  type: string           // Message type
  action: string         // API endpoint or action name
  status: OperationStatus
  errorCode?: string     // Error code if failed
  durationMs: number     // Request processing time
  sourceIp?: string      // For remote connections
  socketPath?: string    // For Unix sockets
}

export interface AuditQuery {
  startTime: string      // ISO 8601
  endTime: string        // ISO 8601
  fromAgent?: string
  toAgent?: string
  status?: OperationStatus
  limit?: number
  cursor?: string        // For pagination (timestamp offset)
}

export interface AuditQueryResult {
  entries: A2ALogEntry[]
  nextCursor?: string
  total: number
}

// Configuration
const LOG_DIR = process.env.A2A_LOG_DIR || 
  (process.env.NODE_ENV === 'test' 
    ? '/tmp/openclaw-a2a-test-logs' 
    : '/var/log/openclaw/a2a')
const LOG_RETENTION_DAYS = parseInt(process.env.A2A_LOG_RETENTION_DAYS || '30', 10)
const CHECKSUM_INTERVAL_MS = 3600000 // 1 hour

// Ensure log directory exists
async function ensureLogDir(): Promise<void> {
  try {
    await access(LOG_DIR)
  } catch {
    await mkdir(LOG_DIR, { recursive: true, mode: 0o755 })
  }
}

/**
 * Get today's log file path
 */
function getLogFilePath(date: Date = new Date()): string {
  const dateStr = date.toISOString().split('T')[0]
  return join(LOG_DIR, `${dateStr}.jsonl`)
}

/**
 * Get checksum file path for a log file
 */
function getChecksumFilePath(logPath: string): string {
  return `${logPath}.sha256`
}

/**
 * Sanitize sensitive data from log entry
 */
function sanitizeEntry(entry: A2ALogEntry): A2ALogEntry {
  // Create a copy to avoid modifying original
  const sanitized = { ...entry }

  // Remove any sensitive fields that might have been included
  // These shouldn't be in the entry, but defensive programming
  const sensitiveFields = ['token', 'password', 'secret', 'key', 'credential']
  
  if (sanitized.errorCode) {
    // Error codes might contain sensitive info in some implementations
    // Ensure we only log predefined error codes
    const allowedErrorCodes = [
      'invalid_signature', 'message_expired', 'nonce_reused',
      'agent_not_found', 'key_revoked', 'unauthorized',
      'rate_limited', 'timeout', 'internal_error'
    ]
    if (!allowedErrorCodes.includes(sanitized.errorCode)) {
      sanitized.errorCode = 'unknown_error'
    }
  }

  return sanitized
}

/**
 * Log an A2A operation
 */
export async function logA2AOperation(
  entry: Omit<A2ALogEntry, 'timestamp'>
): Promise<void> {
  await ensureLogDir()

  const logEntry: A2ALogEntry = {
    ...entry,
    timestamp: new Date().toISOString()
  }

  const sanitized = sanitizeEntry(logEntry)
  const logLine = JSON.stringify(sanitized) + '\n'

  await appendFile(getLogFilePath(), logLine, { mode: 0o644 })
}

/**
 * Query audit logs
 */
export async function queryAuditLogs(query: AuditQuery): Promise<AuditQueryResult> {
  const {
    startTime,
    endTime,
    fromAgent,
    toAgent,
    status,
    limit = 100,
    cursor
  } = query

  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  const cursorTime = cursor ? new Date(cursor).getTime() : null

  const entries: A2ALogEntry[] = []

  // Get all log files in range
  const files = await readdir(LOG_DIR)
  const logFiles = files
    .filter(f => f.endsWith('.jsonl'))
    .filter(f => {
      const fileDate = new Date(f.replace('.jsonl', '')).getTime()
      return fileDate >= start && fileDate <= end
    })
    .sort()

  // Read files in reverse chronological order (newest first)
  for (const file of logFiles.reverse()) {
    if (entries.length >= limit) break

    const content = await readFile(join(LOG_DIR, file), 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)

    // Parse entries in reverse order
    for (const line of lines.reverse()) {
      if (entries.length >= limit) break

      try {
        const entry: A2ALogEntry = JSON.parse(line)
        const entryTime = new Date(entry.timestamp).getTime()

        // Skip entries before cursor
        if (cursorTime && entryTime >= cursorTime) continue

        // Filter by time range
        if (entryTime < start || entryTime > end) continue

        // Filter by other criteria
        if (fromAgent && entry.from !== fromAgent) continue
        if (toAgent && entry.to !== toAgent) continue
        if (status && entry.status !== status) continue

        entries.push(entry)
      } catch {
        // Skip malformed lines
        console.warn(`[A2A Audit] Skipping malformed log line in ${file}`)
      }
    }
  }

  // Sort by timestamp ascending for return
  entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  // Generate next cursor if there are more results
  let nextCursor: string | undefined
  if (entries.length === limit && entries.length > 0) {
    nextCursor = entries[entries.length - 1].timestamp
  }

  return {
    entries,
    nextCursor,
    total: entries.length
  }
}

/**
 * Log authentication success
 */
export async function logAuthSuccess(
  from: string,
  to: string,
  action: string,
  correlationId: string,
  durationMs: number,
  context?: {
    sourceIp?: string
    socketPath?: string
  }
): Promise<void> {
  await logA2AOperation({
    level: 'INFO',
    correlationId,
    from,
    to,
    type: 'AUTH',
    action,
    status: 'success',
    durationMs,
    sourceIp: context?.sourceIp,
    socketPath: context?.socketPath
  })
}

/**
 * Log authentication failure
 */
export async function logAuthFailure(
  from: string,
  to: string,
  action: string,
  correlationId: string,
  errorCode: string,
  durationMs: number,
  context?: {
    sourceIp?: string
    socketPath?: string
  }
): Promise<void> {
  await logA2AOperation({
    level: 'WARN',
    correlationId,
    from,
    to,
    type: 'AUTH',
    action,
    status: 'denied',
    errorCode,
    durationMs,
    sourceIp: context?.sourceIp,
    socketPath: context?.socketPath
  })
}

/**
 * Log message delivery
 */
export async function logMessageDelivery(
  from: string,
  to: string,
  messageType: string,
  correlationId: string,
  success: boolean,
  durationMs: number,
  errorCode?: string
): Promise<void> {
  await logA2AOperation({
    level: success ? 'INFO' : 'ERROR',
    correlationId,
    from,
    to,
    type: messageType,
    action: 'message:deliver',
    status: success ? 'success' : 'failure',
    errorCode,
    durationMs
  })
}

/**
 * Generate checksum for a log file
 */
export async function generateChecksum(date: Date = new Date()): Promise<string> {
  const logPath = getLogFilePath(date)
  const checksumPath = getChecksumFilePath(logPath)

  try {
    const content = await readFile(logPath, 'utf-8')
    const checksum = createHash('sha256').update(content).digest('hex')
    await writeFile(checksumPath, checksum, { mode: 0o644 })
    return checksum
  } catch {
    return ''
  }
}

/**
 * Verify log file integrity
 */
export async function verifyChecksum(date: Date = new Date()): Promise<boolean> {
  const logPath = getLogFilePath(date)
  const checksumPath = getChecksumFilePath(logPath)

  try {
    const [content, storedChecksum] = await Promise.all([
      readFile(logPath, 'utf-8'),
      readFile(checksumPath, 'utf-8')
    ])

    const computedChecksum = createHash('sha256').update(content).digest('hex')
    return computedChecksum === storedChecksum.trim()
  } catch {
    return false
  }
}

// Start periodic checksum generation
setInterval(async () => {
  try {
    await generateChecksum()
    console.log('[A2A Audit] Generated checksum for', new Date().toISOString())
  } catch (error) {
    console.error('[A2A Audit] Failed to generate checksum:', error)
  }
}, CHECKSUM_INTERVAL_MS)
