/**
 * Types for Webhooks (StatusClaw)
 * Based on PRD: Webhook Notifications for Feedback Events
 */

export interface WorkspaceWebhook {
  id: string
  workspace_id: string
  webhook_url: string
  enabled: boolean
  event_types: string[]
  auth_header?: string  // Bearer token or API key for the webhook
  created_at: string
  updated_at: string
}

export interface CreateWebhookRequest {
  webhook_url: string
  enabled?: boolean
  event_types?: string[]
  auth_header?: string
}

export interface UpdateWebhookRequest {
  webhook_url?: string
  enabled?: boolean
  event_types?: string[]
  auth_header?: string
}

export interface WebhookTestResult {
  success: boolean
  status_code?: number
  error?: string
  timestamp: string
}

// Feedback event payload types
export interface FeedbackSubmittedEvent {
  event: 'feedback.submitted'
  timestamp: string
  data: {
    feedback_id: string
    incident_id: string
    incident_title: string
    workspace_id: string
    submitted_by: {
      user_id: string
      email: string
      name: string
    }
    feedback: {
      satisfaction_score: number
      response_quality_comment?: string
      would_recommend: boolean
      additional_notes?: string
    }
    metadata: {
      source: string
      incident_severity: string
    }
  }
}

export interface Feedback {
  id: string
  incident_id: string
  workspace_id: string
  submitted_by: {
    user_id: string
    email: string
    name: string
  }
  feedback: {
    satisfaction_score: number
    response_quality_comment?: string
    would_recommend: boolean
    additional_notes?: string
  }
  created_at: string
}

export interface CreateFeedbackRequest {
  incident_id: string
  workspace_id: string
  submitted_by: {
    user_id: string
    email: string
    name: string
  }
  feedback: {
    satisfaction_score: number
    response_quality_comment?: string
    would_recommend: boolean
    additional_notes?: string
  }
}
