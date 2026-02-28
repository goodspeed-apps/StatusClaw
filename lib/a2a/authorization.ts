/**
 * A2A Authorization
 * Role-based access control for agent-to-agent communication
 */

// Agent role types
export type AgentRole = 
  | 'orchestrator'    // Atlas - can do everything
  | 'executor'        // Backend, web, mobile eng - execute tasks
  | 'observer'        // CFO, CMO - read-only
  | 'security'        // Security agent - audit access
  | 'subagent'        // Spawned agents - receive only
  | 'external'        // External integrations - limited

// Message types
export type MessageCapability =
  | 'COMMAND'         // Execute commands
  | 'QUERY'           // Query data
  | 'RESPONSE'        // Respond to queries
  | 'EVENT'           // Emit events
  | 'AUTH'            // Authentication operations

// Action capabilities
export type ActionCapability =
  | 'incident:create'
  | 'incident:read'
  | 'incident:update'
  | 'incident:delete'
  | 'agent:spawn'
  | 'agent:terminate'
  | 'task:delegate'
  | 'task:complete'
  | 'audit:read'
  | 'config:read'
  | 'config:write'
  | 'key:rotate'
  | 'key:revoke'

// Capability matrix
export const CAPABILITIES_BY_ROLE: Record<AgentRole, {
  messages: MessageCapability[]
  actions: ActionCapability[]
  canSendTo: AgentRole[]
}> = {
  orchestrator: {
    messages: ['COMMAND', 'QUERY', 'RESPONSE', 'EVENT', 'AUTH'],
    actions: [
      'incident:create', 'incident:read', 'incident:update', 'incident:delete',
      'agent:spawn', 'agent:terminate',
      'task:delegate', 'task:complete',
      'audit:read',
      'config:read', 'config:write',
      'key:rotate', 'key:revoke'
    ],
    canSendTo: ['orchestrator', 'executor', 'observer', 'security', 'subagent']
  },

  executor: {
    messages: ['COMMAND', 'QUERY', 'RESPONSE', 'EVENT'],
    actions: [
      'incident:create', 'incident:read', 'incident:update',
      'task:complete'
    ],
    canSendTo: ['orchestrator', 'executor', 'subagent']
  },

  observer: {
    messages: ['QUERY', 'RESPONSE'],
    actions: [
      'incident:read',
      'audit:read'
    ],
    canSendTo: ['orchestrator']
  },

  security: {
    messages: ['QUERY', 'RESPONSE', 'EVENT'],
    actions: [
      'incident:read',
      'audit:read',
      'config:read'
    ],
    canSendTo: ['orchestrator', 'security']
  },

  subagent: {
    messages: ['RESPONSE', 'EVENT'],
    actions: [
      'task:complete'
    ],
    canSendTo: ['orchestrator', 'executor']
  },

  external: {
    messages: ['QUERY'],
    actions: [
      'incident:read'
    ],
    canSendTo: ['orchestrator']
  }
}

// Agent role mappings (which role does each agent have)
export const AGENT_ROLES: Record<string, AgentRole> = {
  atlas: 'orchestrator',
  architect: 'executor',
  backend_eng: 'executor',
  web_eng: 'executor',
  mobile_eng: 'executor',
  cfo: 'observer',
  cmo: 'observer',
  cto: 'executor',
  pm: 'observer',
  revenue_ops: 'observer',
  security: 'security',
  side_hustle_studio: 'executor'
}

/**
 * Get role for an agent ID
 */
export function getAgentRole(agentId: string): AgentRole {
  return AGENT_ROLES[agentId] || 'external'
}

/**
 * Check if an agent has a specific capability
 */
export function hasCapability(
  role: AgentRole,
  capability: MessageCapability | ActionCapability,
  payload?: unknown
): boolean {
  const roleCaps = CAPABILITIES_BY_ROLE[role]
  if (!roleCaps) return false

  // Check message capabilities
  if (roleCaps.messages.includes(capability as MessageCapability)) {
    return true
  }

  // Check action capabilities
  if (roleCaps.actions.includes(capability as ActionCapability)) {
    return true
  }

  return false
}

/**
 * Check if an agent can send to another agent
 */
export function canSendTo(
  fromRole: AgentRole,
  toRole: AgentRole
): boolean {
  const roleCaps = CAPABILITIES_BY_ROLE[fromRole]
  if (!roleCaps) return false

  return roleCaps.canSendTo.includes(toRole)
}

/**
 * Validate authorization for a message
 */
export function validateAuthorization(
  fromAgentId: string,
  toAgentId: string,
  messageType: MessageCapability,
  action?: ActionCapability,
  payload?: unknown
): { authorized: boolean; reason?: string } {
  const fromRole = getAgentRole(fromAgentId)
  const toRole = getAgentRole(toAgentId)

  // Check if can send to target
  if (!canSendTo(fromRole, toRole)) {
    return {
      authorized: false,
      reason: `${fromRole} cannot send to ${toRole}`
    }
  }

  // Check message type capability
  if (!hasCapability(fromRole, messageType, payload)) {
    return {
      authorized: false,
      reason: `${fromRole} does not have ${messageType} capability`
    }
  }

  // Check specific action if provided
  if (action && !hasCapability(fromRole, action, payload)) {
    return {
      authorized: false,
      reason: `${fromRole} does not have ${action} permission`
    }
  }

  return { authorized: true }
}

/**
 * Get all capabilities for a role
 */
export function getRoleCapabilities(role: AgentRole): {
  messages: MessageCapability[]
  actions: ActionCapability[]
  canSendTo: AgentRole[]
} {
  return CAPABILITIES_BY_ROLE[role] || {
    messages: [],
    actions: [],
    canSendTo: []
  }
}
