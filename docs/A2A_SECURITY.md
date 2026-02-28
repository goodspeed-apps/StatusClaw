# A2A Security Model

## Overview

This document describes the Agent-to-Agent (A2A) security model implemented in StatusClaw. It provides secure, authenticated communication channels between autonomous agents in the Atlas system.

## Architecture

### Components

1. **Cryptography Layer**: Ed25519 signatures for message authentication
2. **Key Registry**: Public key storage and management
3. **Nonce Cache**: Replay attack prevention
4. **Secure Channel**: High-level messaging API
5. **Authorization**: Role-based access control (RBAC)
6. **Audit Logger**: Comprehensive logging for security review

## Security Features

### 1. Mutual Authentication

All agents must authenticate using Ed25519 digital signatures:

```typescript
// Each agent has a unique key pair
const keyPair = generateKeyPair() // { publicKey, privateKey }
```

Messages are signed with the sender's private key:

```typescript
const message = await createSignedMessage(
  'atlas',
  'backend_eng',
  'COMMAND',
  { task: 'deploy' },
  privateKey
)
```

Receivers verify signatures using the sender's public key from the registry.

### 2. Message Integrity

Every message includes:
- **Signature**: Ed25519 signature of canonical JSON payload
- **Timestamp**: ISO 8601 timestamp for freshness validation (±5 min window)
- **Nonce**: Unique 16-byte value to prevent replay attacks
- **Correlation ID**: Request tracing across agents

### 3. Replay Protection

The nonce cache tracks all used nonces for 5 minutes. Any message with a reused nonce is rejected.

```typescript
if (isNonceUsed(nonce)) {
  return { valid: false, error: 'nonce_reused' }
}
useNonce(nonce, agentId)
```

### 4. Role-Based Access Control

| Role | Can Message | Can Call | Example Agents |
|------|-------------|----------|----------------|
| orchestrator | All | All actions | Atlas |
| executor | orchestrator, subagent | incident:*, task:* | backend_eng, web_eng |
| observer | orchestrator only | incident:read, audit:read | CFO, CMO, PM |
| security | orchestrator, security | audit:read | security |
| subagent | orchestrator, executor | task:complete | Spawned agents |

### 5. Audit Logging

All A2A operations are logged to `/var/log/openclaw/a2a/YYYY-MM-DD.jsonl`:

```json
{
  "timestamp": "2026-02-28T12:00:00Z",
  "level": "INFO",
  "correlationId": "uuid",
  "from": "atlas",
  "to": "backend_eng",
  "type": "COMMAND",
  "action": "message:deliver",
  "status": "success",
  "durationMs": 15
}
```

Logs include hourly SHA-256 checksums for integrity verification.

## Usage

### Initializing an Agent

```typescript
import { generateKeyPair, initializeAgentKeys, registerAgentKey } from '@/lib/a2a'

// Generate keys
const keyPair = generateKeyPair()

// Save to disk and register
await initializeAgentKeys('my_agent', keyPair)
```

### Sending a Secure Message

```typescript
import { createSecureChannel } from '@/lib/a2a'

const channel = await createSecureChannel({
  agentId: 'atlas',
  privateKey: atlasPrivateKey,
  role: 'orchestrator'
})

const message = await channel.send('backend_eng', 'COMMAND', {
  task: 'deploy',
  target: 'production'
})
```

### Receiving and Verifying

```typescript
const channel = await createSecureChannel({
  agentId: 'backend_eng',
  privateKey: backendPrivateKey,
  role: 'executor'
})

const result = await channel.receive(incomingMessage)

if (result.valid) {
  console.log('Verified payload:', result.data)
} else {
  console.error('Verification failed:', result.error)
}
```

### Querying Audit Logs

```typescript
import { queryAuditLogs } from '@/lib/a2a'

const logs = await queryAuditLogs({
  startTime: '2026-02-28T00:00:00Z',
  endTime: '2026-02-28T23:59:59Z',
  fromAgent: 'atlas',
  status: 'success',
  limit: 100
})
```

## API Endpoints

### Key Management

- `GET /api/a2a/keys` - List registered agent keys
- `POST /api/a2a/keys` - Register or rotate a key
- `DELETE /api/a2a/keys?agentId={id}` - Revoke a key

### Audit Logs

- `GET /api/a2a/audit?startTime={t}&endTime={t}` - Query audit logs
- `POST /api/a2a/audit` - Verify log integrity

All endpoints require A2A authentication headers:

```
X-Agent-ID: atlas
X-Timestamp: 2026-02-28T12:00:00Z
X-Nonce: <16-byte-hex>
X-Signature: <ed25519-signature>
X-Correlation-ID: <uuid>
```

## Security Considerations

### Key Management
- Private keys are never transmitted over A2A channels
- Keys are stored with 0600 permissions
- 90-day rotation recommended
- Revocation list maintained for compromised keys

### Clock Synchronization
- Messages valid for ±5 minutes
- Out-of-sync clocks will cause authentication failures
- NTP sync required on all hosts

### Replay Attacks
- Nonce cache prevents replay within 5-minute window
- After window expires, old nonces are purged
- Clock sync ensures fresh messages

### Denial of Service
- Rate limiting on authentication attempts
- Message size limit: 1MB
- Nonce cache bounded by memory (cleans up expired entries)

### Logging
- Never log private keys, signatures, or secrets
- Sanitize error messages in logs
- Append-only log files with integrity checksums

## Threat Model

| Threat | Mitigation |
|--------|------------|
| Agent Impersonation | Ed25519 signatures + key registry |
| Message Tampering | Cryptographic signatures |
| Replay Attacks | Nonce + timestamp validation |
| Credential Leakage | Short-lived tokens, no secrets in messages |
| Man-in-the-Middle | TLS 1.3 with certificate pinning |
| Insider Threats | Audit logging + least privilege |

## Testing

Run the A2A security tests:

```bash
npm test -- __tests__/a2a-
```

Test coverage includes:
- Cryptographic operations
- Signature verification
- Replay attack prevention
- Authorization rules
- Secure channel operations

## Deployment Checklist

- [ ] Generate Ed25519 key pairs for all agents
- [ ] Register keys in the key registry
- [ ] Configure log directory with proper permissions
- [ ] Enable NTP synchronization
- [ ] Set up log rotation (30-day retention default)
- [ ] Configure audit log alerting
- [ ] Test inter-agent communication
- [ ] Verify audit logs are written correctly
