// Feedback persistence layer - stores feedback submissions

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { Feedback, CreateFeedbackRequest } from '@/types/webhook'

const FEEDBACK_FILE = join(process.cwd(), 'data', 'feedback.json')

// Ensure data directory exists
try {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true })
} catch {}

interface FeedbackStore {
  feedback: Feedback[]
  lastUpdated: string
  version: number
}

function loadFeedbackFromFile(): Feedback[] {
  try {
    if (existsSync(FEEDBACK_FILE)) {
      const data = readFileSync(FEEDBACK_FILE, 'utf-8')
      const store: FeedbackStore = JSON.parse(data)
      return store.feedback
    }
  } catch (error) {
    console.error('Failed to load feedback from file:', error)
  }
  return []
}

function saveFeedbackToFile(feedback: Feedback[]) {
  try {
    const store: FeedbackStore = {
      feedback,
      lastUpdated: new Date().toISOString(),
      version: 1,
    }
    writeFileSync(FEEDBACK_FILE, JSON.stringify(store, null, 2))
  } catch (error) {
    console.error('Failed to save feedback to file:', error)
  }
}

function generateId(): string {
  return `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export class FeedbackStoreManager {
  private feedback: Feedback[]

  constructor() {
    this.feedback = loadFeedbackFromFile()
  }

  /**
   * Get all feedback entries
   */
  getFeedback(): Feedback[] {
    return [...this.feedback].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  /**
   * Get feedback for a specific incident
   */
  getFeedbackByIncidentId(incidentId: string): Feedback[] {
    return this.feedback.filter(f => f.incident_id === incidentId)
  }

  /**
   * Get feedback by ID
   */
  getFeedbackById(id: string): Feedback | null {
    return this.feedback.find(f => f.id === id) || null
  }

  /**
   * Get feedback by workspace
   */
  getFeedbackByWorkspace(workspaceId: string): Feedback[] {
    return this.feedback.filter(f => f.workspace_id === workspaceId)
  }

  /**
   * Create new feedback
   */
  createFeedback(data: CreateFeedbackRequest): Feedback {
    // Validate satisfaction_score (1-5)
    if (data.feedback.satisfaction_score < 1 || data.feedback.satisfaction_score > 5) {
      throw new Error('INVALID_SATISFACTION_SCORE: Must be between 1 and 5')
    }

    const now = new Date().toISOString()
    const newFeedback: Feedback = {
      id: generateId(),
      incident_id: data.incident_id,
      workspace_id: data.workspace_id,
      submitted_by: data.submitted_by,
      feedback: data.feedback,
      created_at: now,
    }

    this.feedback.push(newFeedback)
    saveFeedbackToFile(this.feedback)
    return newFeedback
  }
}

// Export singleton instance
export const feedbackStore = new FeedbackStoreManager()

// Also export for API routes
export function getFeedbackStore() {
  return feedbackStore
}
