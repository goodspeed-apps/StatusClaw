import { describe, it, expect } from 'vitest'
import {
  getAgentRole,
  hasCapability,
  canSendTo,
  validateAuthorization,
  getRoleCapabilities,
  AGENT_ROLES,
  CAPABILITIES_BY_ROLE
} from '@/lib/a2a/authorization'
import type { AgentRole, MessageCapability, ActionCapability } from '@/lib/a2a/authorization'

describe('A2A Authorization', () => {
  describe('Agent Roles', () => {
    it('should return correct role for known agents', () => {
      expect(getAgentRole('atlas')).toBe('orchestrator')
      expect(getAgentRole('backend_eng')).toBe('executor')
      expect(getAgentRole('cfo')).toBe('observer')
      expect(getAgentRole('security')).toBe('security')
    })

    it('should return external for unknown agents', () => {
      expect(getAgentRole('unknown_agent')).toBe('external')
      expect(getAgentRole('hacker')).toBe('external')
    })
  })

  describe('Capability Matrix', () => {
    it('orchestrator should have all capabilities', () => {
      const caps = CAPABILITIES_BY_ROLE.orchestrator
      
      expect(caps.messages).toContain('COMMAND')
      expect(caps.messages).toContain('QUERY')
      expect(caps.messages).toContain('RESPONSE')
      expect(caps.messages).toContain('EVENT')
      expect(caps.messages).toContain('AUTH')
      
      expect(caps.actions).toContain('agent:spawn')
      expect(caps.actions).toContain('key:rotate')
      expect(caps.actions).toContain('audit:read')
      
      expect(caps.canSendTo).toContain('executor')
      expect(caps.canSendTo).toContain('observer')
      expect(caps.canSendTo).toContain('security')
    })

    it('observer should have limited capabilities', () => {
      const caps = CAPABILITIES_BY_ROLE.observer
      
      expect(caps.messages).toContain('QUERY')
      expect(caps.messages).toContain('RESPONSE')
      expect(caps.messages).not.toContain('COMMAND')
      expect(caps.messages).not.toContain('EVENT')
      
      expect(caps.actions).toContain('incident:read')
      expect(caps.actions).not.toContain('incident:create')
      expect(caps.actions).not.toContain('agent:spawn')
    })

    it('subagent should only have RESPONSE and EVENT', () => {
      const caps = CAPABILITIES_BY_ROLE.subagent
      
      expect(caps.messages).toContain('RESPONSE')
      expect(caps.messages).toContain('EVENT')
      expect(caps.messages).not.toContain('COMMAND')
      expect(caps.messages).not.toContain('QUERY')
    })
  })

  describe('hasCapability', () => {
    it('should return true for permitted message types', () => {
      expect(hasCapability('orchestrator', 'COMMAND')).toBe(true)
      expect(hasCapability('executor', 'COMMAND')).toBe(true)
      expect(hasCapability('observer', 'QUERY')).toBe(true)
    })

    it('should return false for unauthorized message types', () => {
      expect(hasCapability('observer', 'COMMAND')).toBe(false)
      expect(hasCapability('subagent', 'COMMAND')).toBe(false)
      expect(hasCapability('external', 'COMMAND')).toBe(false)
    })

    it('should return true for permitted actions', () => {
      expect(hasCapability('orchestrator', 'incident:create' as ActionCapability)).toBe(true)
      expect(hasCapability('security', 'audit:read' as ActionCapability)).toBe(true)
      expect(hasCapability('executor', 'task:complete' as ActionCapability)).toBe(true)
    })

    it('should return false for unauthorized actions', () => {
      expect(hasCapability('observer', 'incident:create' as ActionCapability)).toBe(false)
      expect(hasCapability('executor', 'agent:spawn' as ActionCapability)).toBe(false)
      expect(hasCapability('subagent', 'key:rotate' as ActionCapability)).toBe(false)
    })
  })

  describe('canSendTo', () => {
    it('orchestrator can send to all roles', () => {
      expect(canSendTo('orchestrator', 'executor')).toBe(true)
      expect(canSendTo('orchestrator', 'observer')).toBe(true)
      expect(canSendTo('orchestrator', 'security')).toBe(true)
      expect(canSendTo('orchestrator', 'subagent')).toBe(true)
    })

    it('executor can send to orchestrator and subagents', () => {
      expect(canSendTo('executor', 'orchestrator')).toBe(true)
      expect(canSendTo('executor', 'subagent')).toBe(true)
      expect(canSendTo('executor', 'observer')).toBe(false)
    })

    it('observer can only send to orchestrator', () => {
      expect(canSendTo('observer', 'orchestrator')).toBe(true)
      expect(canSendTo('observer', 'executor')).toBe(false)
      expect(canSendTo('observer', 'subagent')).toBe(false)
    })

    it('subagent can send to orchestrator and executor', () => {
      expect(canSendTo('subagent', 'orchestrator')).toBe(true)
      expect(canSendTo('subagent', 'executor')).toBe(true)
      expect(canSendTo('subagent', 'subagent')).toBe(false)
    })
  })

  describe('validateAuthorization', () => {
    it('should authorize valid orchestrator request', () => {
      const result = validateAuthorization(
        'atlas',
        'backend_eng',
        'COMMAND',
        'incident:create'
      )
      
      expect(result.authorized).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('should deny observer sending COMMAND', () => {
      const result = validateAuthorization(
        'cfo',
        'backend_eng',
        'COMMAND'
      )
      
      expect(result.authorized).toBe(false)
      // Observer cannot send to executor (checked first)
      expect(result.reason).toContain('cannot send to')
    })

    it('should deny observer to executor communication', () => {
      const result = validateAuthorization(
        'cfo',
        'backend_eng',
        'QUERY'
      )
      
      expect(result.authorized).toBe(false)
      expect(result.reason).toContain('cannot send to')
    })

    it('should allow observer to query orchestrator', () => {
      const result = validateAuthorization(
        'cfo',
        'atlas',
        'QUERY'
      )
      
      expect(result.authorized).toBe(true)
    })

    it('should deny unauthorized action', () => {
      const result = validateAuthorization(
        'backend_eng',
        'atlas',
        'COMMAND',
        'agent:spawn'
      )
      
      expect(result.authorized).toBe(false)
      expect(result.reason).toContain('does not have agent:spawn permission')
    })
  })

  describe('getRoleCapabilities', () => {
    it('should return all capabilities for orchestrator', () => {
      const caps = getRoleCapabilities('orchestrator')
      
      expect(caps.messages).toHaveLength(5)
      expect(caps.actions.length).toBeGreaterThan(10)
      expect(caps.canSendTo.length).toBe(5)
    })

    it('should return empty for invalid role', () => {
      const caps = getRoleCapabilities('invalid_role' as AgentRole)
      
      expect(caps.messages).toHaveLength(0)
      expect(caps.actions).toHaveLength(0)
      expect(caps.canSendTo).toHaveLength(0)
    })
  })
})
