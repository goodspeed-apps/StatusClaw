/**
 * A2A (Agent-to-Agent) Security Module
 * Secure inter-agent communication for Atlas/StatusClaw
 */

// Cryptography
export {
  generateKeyPair,
  signMessage,
  verifyMessage,
  canonicalizePayload,
  generateNonce,
  generateUUID,
  hashValue,
  createSignedMessage,
  verifySignedMessage,
  type KeyPair,
  type SignedMessage,
  type MessagePayload
} from './crypto'

// Key Registry
export {
  registerAgentKey,
  getAgentPublicKey,
  getAgentKeyEntry,
  isAgentKeyValid,
  revokeAgentKey,
  listRegisteredAgents,
  listRevokedAgents,
  rotateAgentKey,
  initializeAgentKeys,
  getAgentKeyPath,
  getAgentPublicKeyPath,
  type AgentKeyEntry,
  type KeyRegistry
} from './key-registry'

// Nonce Cache
export {
  isNonceUsed,
  useNonce,
  getCacheStats,
  clearNonceCache
} from './nonce-cache'

// Audit Logger
export {
  logA2AOperation,
  queryAuditLogs,
  logAuthSuccess,
  logAuthFailure,
  logMessageDelivery,
  generateChecksum,
  verifyChecksum,
  type A2ALogEntry,
  type AuditQuery,
  type AuditQueryResult,
  type LogLevel,
  type OperationStatus
} from './audit-logger'

// Secure Channel
export {
  SecureChannel,
  createSecureChannel,
  sendSecureMessage,
  receiveSecureMessage,
  type SecureMessage,
  type MessageType,
  type SecureChannelConfig,
  type SendOptions,
  type ChannelStats
} from './secure-channel'

// Authorization
export {
  getAgentRole,
  hasCapability,
  canSendTo,
  validateAuthorization,
  getRoleCapabilities,
  AGENT_ROLES,
  CAPABILITIES_BY_ROLE,
  type AgentRole,
  type MessageCapability,
  type ActionCapability
} from './authorization'
