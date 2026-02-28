/**
 * Types for the Outcome Tracking API
 * Based on PRD: Outcome Tracking API MVP (StatusClaw)
 */

export interface Outcome {
  id: string
  incident_id: string
  time_to_resolve_seconds: number
  root_cause: string
  satisfaction_score?: number
  resolved_by?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface CreateOutcomeRequest {
  incident_id: string
  time_to_resolve_seconds: number
  root_cause: string
  satisfaction_score?: number
  resolved_by?: string
  notes?: string
}

export interface TeamMetrics {
  period: string
  total_incidents: number
  total_resolved: number
  average_resolution_time_seconds: number
  median_resolution_time_seconds: number
  average_satisfaction_score: number
  satisfaction_distribution: Record<string, number>
  top_root_causes: Array<{ cause: string; count: number }>
}

export type PeriodParam = '7d' | '30d' | '90d'

export const VALID_PERIODS: PeriodParam[] = ['7d', '30d', '90d']
export const DEFAULT_PERIOD: PeriodParam = '30d'
