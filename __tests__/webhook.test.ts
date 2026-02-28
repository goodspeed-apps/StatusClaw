/**
 * Webhook Store Unit Tests
 * 
 * Tests for:
 * - Webhook CRUD operations
 * - Validation (HTTPS URL requirement, max webhooks)
 * - Event filtering
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WebhookStoreManager } from '@/lib/webhook-store'
import { FeedbackStoreManager } from '@/lib/feedback-store'
import { buildFeedbackEventPayload } from '@/lib/webhook-service'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

// Constants
const WEBHOOKS_FILE = join(process.cwd(), 'data', 'webhooks.json')
const FEEDBACK_FILE = join(process.cwd(), 'data', 'feedback.json')

// Helper to clear webhooks file
function clearWebhooksFile() {
  try {
    if (existsSync(WEBHOOKS_FILE)) {
      writeFileSync(WEBHOOKS_FILE, JSON.stringify({ webhooks: [], lastUpdated: new Date().toISOString(), version: 1 }, null, 2))
    }
  } catch (e) {
    // ignore
  }
}

// Helper to clear feedback file
function clearFeedbackFile() {
  try {
    if (existsSync(FEEDBACK_FILE)) {
      writeFileSync(FEEDBACK_FILE, JSON.stringify({ feedback: [], lastUpdated: new Date().toISOString(), version: 1 }, null, 2))
    }
  } catch (e) {
    // ignore
  }
}

describe('WebhookStoreManager', () => {
  let store: WebhookStoreManager

  beforeEach(() => {
    clearWebhooksFile()
    store = new WebhookStoreManager()
  })

  describe('createWebhook', () => {
    it('should create a webhook with valid HTTPS URL', () => {
      const webhook = store.createWebhook('ws_test', {
        webhook_url: 'https://example.com/webhook',
        enabled: true,
        event_types: ['feedback.submitted'],
      })

      expect(webhook.id).toMatch(/^wh_/)
      expect(webhook.workspace_id).toBe('ws_test')
      expect(webhook.webhook_url).toBe('https://example.com/webhook')
      expect(webhook.enabled).toBe(true)
      expect(webhook.event_types).toContain('feedback.submitted')
    })

    it('should reject HTTP URLs', () => {
      expect(() => {
        store.createWebhook('ws_test', {
          webhook_url: 'http://example.com/webhook',
        })
      }).toThrow('INVALID_URL')
    })

    it('should reject invalid URLs', () => {
      expect(() => {
        store.createWebhook('ws_test', {
          webhook_url: 'not-a-url',
        })
      }).toThrow('INVALID_URL')
    })

    it('should enforce max 5 webhooks per workspace', () => {
      // Create 5 webhooks
      for (let i = 0; i < 5; i++) {
        store.createWebhook('ws_test', {
          webhook_url: `https://example${i}.com/webhook`,
        })
      }

      // 6th should fail
      expect(() => {
        store.createWebhook('ws_test', {
          webhook_url: 'https://example6.com/webhook',
        })
      }).toThrow('MAX_WEBHOOKS_REACHED')
    })

    it('should allow webhooks in different workspaces beyond limit', () => {
      // Create 5 webhooks for ws_test1
      for (let i = 0; i < 5; i++) {
        store.createWebhook('ws_test1', {
          webhook_url: `https://example${i}.com/webhook`,
        })
      }

      // Should work for different workspace
      const webhook = store.createWebhook('ws_test2', {
        webhook_url: 'https://newworkspace.com/webhook',
      })
      expect(webhook.workspace_id).toBe('ws_test2')
    })
  })

  describe('getWebhooksByWorkspace', () => {
    it('should return only webhooks for specified workspace', () => {
      store.createWebhook('ws_1', { webhook_url: 'https://example1.com/webhook' })
      store.createWebhook('ws_2', { webhook_url: 'https://example2.com/webhook' })
      store.createWebhook('ws_1', { webhook_url: 'https://example3.com/webhook' })

      const ws1Webhooks = store.getWebhooksByWorkspace('ws_1')
      const ws2Webhooks = store.getWebhooksByWorkspace('ws_2')

      expect(ws1Webhooks).toHaveLength(2)
      expect(ws2Webhooks).toHaveLength(1)
    })
  })

  describe('getEnabledWebhooks', () => {
    it('should return only enabled webhooks for event type', () => {
      store.createWebhook('ws_test', { 
        webhook_url: 'https://example1.com/webhook',
        enabled: true,
        event_types: ['feedback.submitted'],
      })
      store.createWebhook('ws_test', { 
        webhook_url: 'https://example2.com/webhook',
        enabled: false,
        event_types: ['feedback.submitted'],
      })
      store.createWebhook('ws_test', { 
        webhook_url: 'https://example3.com/webhook',
        enabled: true,
        event_types: ['other.event'],
      })

      const enabled = store.getEnabledWebhooks('ws_test', 'feedback.submitted')
      expect(enabled).toHaveLength(1)
      expect(enabled[0].webhook_url).toBe('https://example1.com/webhook')
    })
  })

  describe('updateWebhook', () => {
    it('should update webhook properties', () => {
      const created = store.createWebhook('ws_test', {
        webhook_url: 'https://example.com/webhook',
        enabled: true,
      })

      const updated = store.updateWebhook(created.id, {
        enabled: false,
      })

      expect(updated).not.toBeNull()
      expect(updated!.enabled).toBe(false)
      expect(updated!.webhook_url).toBe('https://example.com/webhook')
    })

    it('should reject invalid URL on update', () => {
      const created = store.createWebhook('ws_test', {
        webhook_url: 'https://example.com/webhook',
      })

      expect(() => {
        store.updateWebhook(created.id, { webhook_url: 'http://bad.com' })
      }).toThrow('INVALID_URL')
    })
  })

  describe('deleteWebhook', () => {
    it('should delete webhook by ID', () => {
      const created = store.createWebhook('ws_test', {
        webhook_url: 'https://example.com/webhook',
      })

      const deleted = store.deleteWebhook(created.id)
      expect(deleted).toBe(true)

      const found = store.getWebhookById(created.id)
      expect(found).toBeNull()
    })

    it('should return false for non-existent webhook', () => {
      const deleted = store.deleteWebhook('non_existent_id')
      expect(deleted).toBe(false)
    })
  })
})

describe('Webhook Service', () => {
  describe('buildFeedbackEventPayload', () => {
    it('should build correct payload structure', () => {
      const feedback = {
        id: 'fb_test123',
        incident_id: 'inc_test456',
        workspace_id: 'ws_test',
        submitted_by: {
          user_id: 'usr_123',
          email: 'john@example.com',
          name: 'John Smith',
        },
        feedback: {
          satisfaction_score: 4,
          response_quality_comment: 'Good response',
          would_recommend: true,
          additional_notes: 'Great job!',
        },
        created_at: '2026-02-28T10:00:00Z',
      }

      const payload = buildFeedbackEventPayload(feedback, 'API Outage', 'high')

      expect(payload.event).toBe('feedback.submitted')
      expect(payload.data.feedback_id).toBe('fb_test123')
      expect(payload.data.incident_id).toBe('inc_test456')
      expect(payload.data.incident_title).toBe('API Outage')
      expect(payload.data.workspace_id).toBe('ws_test')
      expect(payload.data.submitted_by.email).toBe('john@example.com')
      expect(payload.data.feedback.satisfaction_score).toBe(4)
      expect(payload.data.metadata.incident_severity).toBe('high')
    })
  })
})

describe('FeedbackStoreManager', () => {
  let store: FeedbackStoreManager

  beforeEach(() => {
    clearFeedbackFile()
    store = new FeedbackStoreManager()
  })

  describe('createFeedback', () => {
    it('should create feedback with valid data', () => {
      const feedback = store.createFeedback({
        incident_id: 'inc_test',
        workspace_id: 'ws_test',
        submitted_by: {
          user_id: 'usr_123',
          email: 'test@example.com',
          name: 'Test User',
        },
        feedback: {
          satisfaction_score: 4,
          would_recommend: true,
        },
      })

      expect(feedback.id).toMatch(/^fb_/)
      expect(feedback.incident_id).toBe('inc_test')
      expect(feedback.workspace_id).toBe('ws_test')
      expect(feedback.feedback.satisfaction_score).toBe(4)
    })

    it('should reject invalid satisfaction score', () => {
      expect(() => {
        store.createFeedback({
          incident_id: 'inc_test',
          workspace_id: 'ws_test',
          submitted_by: {
            user_id: 'usr_123',
            email: 'test@example.com',
            name: 'Test User',
          },
          feedback: {
            satisfaction_score: 6, // Invalid - must be 1-5
            would_recommend: true,
          },
        })
      }).toThrow('INVALID_SATISFACTION_SCORE')
    })
  })
})
