import { describe, it, expect, beforeEach } from 'vitest'
import {
  sendEmailWithDeduplication,
  generateIdempotencyKey,
  hasNotificationBeenSent,
  getDeduplicationStats,
  getNotificationsForIncident,
  clearNotificationStore,
  isEmailEnabled,
  NotificationType
} from '@/lib/notification-service'

describe('Notification Service - Deduplication', () => {
  beforeEach(() => {
    clearNotificationStore()
  })

  describe('generateIdempotencyKey', () => {
    it('should generate consistent keys for same inputs', () => {
      const key1 = generateIdempotencyKey('inc-123', 'user@example.com', 'incident_created')
      const key2 = generateIdempotencyKey('inc-123', 'user@example.com', 'incident_created')
      expect(key1).toBe(key2)
    })

    it('should generate different keys for different recipients', () => {
      const key1 = generateIdempotencyKey('inc-123', 'user1@example.com', 'incident_created')
      const key2 = generateIdempotencyKey('inc-123', 'user2@example.com', 'incident_created')
      expect(key1).not.toBe(key2)
    })

    it('should generate different keys for different incidents', () => {
      const key1 = generateIdempotencyKey('inc-123', 'user@example.com', 'incident_created')
      const key2 = generateIdempotencyKey('inc-456', 'user@example.com', 'incident_created')
      expect(key1).not.toBe(key2)
    })

    it('should generate different keys for different types', () => {
      const key1 = generateIdempotencyKey('inc-123', 'user@example.com', 'incident_created')
      const key2 = generateIdempotencyKey('inc-123', 'user@example.com', 'incident_updated')
      expect(key1).not.toBe(key2)
    })
  })

  describe('sendEmailWithDeduplication', () => {
    it('should send email successfully on first attempt', async () => {
      const result = await sendEmailWithDeduplication({
        incidentId: 'inc-123',
        recipient: 'user@example.com',
        type: 'incident_created',
        subject: 'Test Subject',
        body: 'Test Body'
      })

      expect(result.sent).toBe(true)
      expect(result.reason).toBeUndefined()
      expect(result.record.status).toBe('sent')
      expect(result.record.idempotencyKey).toBeDefined()
    })

    it('should prevent duplicate emails for same incident/recipient/type', async () => {
      const request = {
        incidentId: 'inc-123',
        recipient: 'user@example.com',
        type: 'incident_created',
        subject: 'Test Subject',
        body: 'Test Body'
      }

      // First send
      const result1 = await sendEmailWithDeduplication(request)
      expect(result1.sent).toBe(true)

      // Duplicate send
      const result2 = await sendEmailWithDeduplication(request)
      expect(result2.sent).toBe(false)
      expect(result2.reason).toBe('duplicate')
      expect(result2.record.idempotencyKey).toBe(result1.record.idempotencyKey)
    })

    it('should allow different notification types for same incident', async () => {
      const baseRequest = {
        incidentId: 'inc-123',
        recipient: 'user@example.com',
        subject: 'Test Subject',
        body: 'Test Body'
      }

      const result1 = await sendEmailWithDeduplication({
        ...baseRequest,
        type: 'incident_created' as NotificationType
      })
      expect(result1.sent).toBe(true)

      const result2 = await sendEmailWithDeduplication({
        ...baseRequest,
        type: 'incident_updated' as NotificationType
      })
      expect(result2.sent).toBe(true)
    })

    it('should allow same notification type for different recipients', async () => {
      const baseRequest = {
        incidentId: 'inc-123',
        type: 'incident_created' as NotificationType,
        subject: 'Test Subject',
        body: 'Test Body'
      }

      const result1 = await sendEmailWithDeduplication({
        ...baseRequest,
        recipient: 'user1@example.com'
      })
      expect(result1.sent).toBe(true)

      const result2 = await sendEmailWithDeduplication({
        ...baseRequest,
        recipient: 'user2@example.com'
      })
      expect(result2.sent).toBe(true)
    })

    it('should support custom idempotency keys', async () => {
      const customKey = 'my-custom-key-123'
      
      const result1 = await sendEmailWithDeduplication({
        incidentId: 'inc-123',
        recipient: 'user@example.com',
        type: 'incident_created',
        subject: 'Test Subject',
        body: 'Test Body',
        idempotencyKey: customKey
      })
      expect(result1.sent).toBe(true)
      expect(result1.record.idempotencyKey).toBe(customKey)

      const result2 = await sendEmailWithDeduplication({
        incidentId: 'inc-456', // Different incident
        recipient: 'other@example.com', // Different recipient
        type: 'incident_updated', // Different type
        subject: 'Different Subject',
        body: 'Different Body',
        idempotencyKey: customKey // Same custom key
      })
      expect(result2.sent).toBe(false)
      expect(result2.reason).toBe('duplicate')
    })

    it('should prevent race conditions with in-flight notifications', async () => {
      // This test simulates rapid concurrent requests
      const request = {
        incidentId: 'inc-123',
        recipient: 'user@example.com',
        type: 'incident_created',
        subject: 'Test Subject',
        body: 'Test Body'
      }

      // Send multiple requests concurrently
      const promises = Array(5).fill(null).map(() => 
        sendEmailWithDeduplication(request)
      )

      const results = await Promise.all(promises)

      // Only one should succeed
      const sentCount = results.filter(r => r.sent).length
      const duplicateCount = results.filter(r => !r.sent && r.reason === 'duplicate').length
      const inProgressCount = results.filter(r => !r.sent && r.reason === 'already_in_progress').length

      expect(sentCount).toBe(1)
      expect(duplicateCount + inProgressCount).toBe(4)
    })
  })

  describe('getNotificationsForIncident', () => {
    it('should return all notifications for a specific incident', async () => {
      await sendEmailWithDeduplication({
        incidentId: 'inc-123',
        recipient: 'user1@example.com',
        type: 'incident_created',
        subject: 'Test',
        body: 'Test'
      })

      await sendEmailWithDeduplication({
        incidentId: 'inc-123',
        recipient: 'user2@example.com',
        type: 'incident_updated',
        subject: 'Test',
        body: 'Test'
      })

      await sendEmailWithDeduplication({
        incidentId: 'inc-456',
        recipient: 'user3@example.com',
        type: 'incident_created',
        subject: 'Test',
        body: 'Test'
      })

      const notifications = getNotificationsForIncident('inc-123')
      expect(notifications).toHaveLength(2)
    })
  })

  describe('getDeduplicationStats', () => {
    it('should return accurate stats', async () => {
      // Initially empty
      const initialStats = getDeduplicationStats()
      expect(initialStats.totalRecords).toBe(0)
      expect(initialStats.sent).toBe(0)

      // Send some notifications
      await sendEmailWithDeduplication({
        incidentId: 'inc-1',
        recipient: 'user1@example.com',
        type: 'incident_created',
        subject: 'Test',
        body: 'Test'
      })

      await sendEmailWithDeduplication({
        incidentId: 'inc-2',
        recipient: 'user2@example.com',
        type: 'incident_created',
        subject: 'Test',
        body: 'Test'
      })

      const stats = getDeduplicationStats()
      expect(stats.totalRecords).toBe(2)
      expect(stats.sent).toBe(2)
      expect(typeof stats.emailEnabled).toBe('boolean')
    })
  })

  describe('isEmailEnabled', () => {
    it('should return a boolean value', () => {
      const enabled = isEmailEnabled()
      expect(typeof enabled).toBe('boolean')
    })
  })

  describe('clearNotificationStore', () => {
    it('should clear all notification records', async () => {
      await sendEmailWithDeduplication({
        incidentId: 'inc-123',
        recipient: 'user@example.com',
        type: 'incident_created',
        subject: 'Test',
        body: 'Test'
      })

      expect(getDeduplicationStats().totalRecords).toBe(1)

      clearNotificationStore()

      expect(getDeduplicationStats().totalRecords).toBe(0)
    })
  })
})
