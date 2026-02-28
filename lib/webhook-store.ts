// Webhook persistence layer - stores webhook configurations

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { WorkspaceWebhook, CreateWebhookRequest, UpdateWebhookRequest } from '@/types/webhook'

const WEBHOOKS_FILE = join(process.cwd(), 'data', 'webhooks.json')

// Ensure data directory exists
try {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true })
} catch {}

interface WebhookStore {
  webhooks: WorkspaceWebhook[]
  lastUpdated: string
  version: number
}

function loadWebhooksFromFile(): WorkspaceWebhook[] {
  try {
    if (existsSync(WEBHOOKS_FILE)) {
      const data = readFileSync(WEBHOOKS_FILE, 'utf-8')
      const store: WebhookStore = JSON.parse(data)
      return store.webhooks
    }
  } catch (error) {
    console.error('Failed to load webhooks from file:', error)
  }
  return []
}

function saveWebhooksToFile(webhooks: WorkspaceWebhook[]) {
  try {
    const store: WebhookStore = {
      webhooks,
      lastUpdated: new Date().toISOString(),
      version: 1,
    }
    writeFileSync(WEBHOOKS_FILE, JSON.stringify(store, null, 2))
  } catch (error) {
    console.error('Failed to save webhooks to file:', error)
  }
}

function generateId(): string {
  return `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// URL validation helper
function isValidHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export class WebhookStoreManager {
  private webhooks: WorkspaceWebhook[]

  constructor() {
    this.webhooks = loadWebhooksFromFile()
  }

  /**
   * Get all webhooks
   */
  getWebhooks(): WorkspaceWebhook[] {
    return [...this.webhooks].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  /**
   * Get webhooks for a specific workspace
   */
  getWebhooksByWorkspace(workspaceId: string): WorkspaceWebhook[] {
    return this.webhooks.filter(w => w.workspace_id === workspaceId)
  }

  /**
   * Get enabled webhooks for a workspace that listen for specific event types
   */
  getEnabledWebhooks(workspaceId: string, eventType: string): WorkspaceWebhook[] {
    return this.webhooks.filter(
      w => w.workspace_id === workspaceId && 
           w.enabled && 
           w.event_types.includes(eventType)
    )
  }

  /**
   * Get webhook by ID
   */
  getWebhookById(id: string): WorkspaceWebhook | null {
    return this.webhooks.find(w => w.id === id) || null
  }

  /**
   * Create a new webhook
   * @throws Error if validation fails
   */
  createWebhook(workspaceId: string, data: CreateWebhookRequest): WorkspaceWebhook {
    // Validate URL is HTTPS
    if (!isValidHttpsUrl(data.webhook_url)) {
      throw new Error('INVALID_URL: Webhook URL must be a valid HTTPS URL')
    }

    // Check max webhooks per workspace (max 5)
    const workspaceWebhooks = this.getWebhooksByWorkspace(workspaceId)
    if (workspaceWebhooks.length >= 5) {
      throw new Error('MAX_WEBHOOKS_REACHED: Maximum 5 webhooks per workspace')
    }

    const now = new Date().toISOString()
    const webhook: WorkspaceWebhook = {
      id: generateId(),
      workspace_id: workspaceId,
      webhook_url: data.webhook_url,
      enabled: data.enabled ?? true,
      event_types: data.event_types ?? ['feedback.submitted'],
      auth_header: data.auth_header,
      created_at: now,
      updated_at: now,
    }

    this.webhooks.push(webhook)
    saveWebhooksToFile(this.webhooks)
    return webhook
  }

  /**
   * Update an existing webhook
   */
  updateWebhook(id: string, data: UpdateWebhookRequest): WorkspaceWebhook | null {
    const index = this.webhooks.findIndex(w => w.id === id)
    if (index === -1) return null

    // Validate URL if provided
    if (data.webhook_url && !isValidHttpsUrl(data.webhook_url)) {
      throw new Error('INVALID_URL: Webhook URL must be a valid HTTPS URL')
    }

    const webhook = this.webhooks[index]
    const updated: WorkspaceWebhook = {
      ...webhook,
      webhook_url: data.webhook_url ?? webhook.webhook_url,
      enabled: data.enabled ?? webhook.enabled,
      event_types: data.event_types ?? webhook.event_types,
      auth_header: data.auth_header !== undefined ? data.auth_header : webhook.auth_header,
      updated_at: new Date().toISOString(),
    }

    this.webhooks[index] = updated
    saveWebhooksToFile(this.webhooks)
    return updated
  }

  /**
   * Delete a webhook
   */
  deleteWebhook(id: string): boolean {
    const index = this.webhooks.findIndex(w => w.id === id)
    if (index === -1) return false

    this.webhooks.splice(index, 1)
    saveWebhooksToFile(this.webhooks)
    return true
  }

  /**
   * Delete all webhooks for a workspace (for cleanup when workspace is deleted)
   */
  deleteWebhooksByWorkspace(workspaceId: string): number {
    const initialLength = this.webhooks.length
    this.webhooks = this.webhooks.filter(w => w.workspace_id !== workspaceId)
    saveWebhooksToFile(this.webhooks)
    return initialLength - this.webhooks.length
  }
}

// Export singleton instance
export const webhookStore = new WebhookStoreManager()

// Also export for API routes
export function getWebhookStore() {
  return webhookStore
}
