'use client'

/**
 * Incident Timeline Component
 * Visual timeline showing incident phases, time spent in each status,
 * and updates/reports displayed at each stage.
 * 
 * Based on PRD: Incident Timeline Component (StatusClaw)
 */

import React, { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronUp, Clock, Link2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { Incident, TimelineStage, IncidentStatus } from '@/types/incident'
import {
  buildTimelineStages,
  formatDurationShort,
  formatTimestamp,
  isIncidentResolved,
  getStatusLabel,
  getStatusColor,
  parseDate,
  calculateIncidentDuration,
} from '@/lib/timeline-utils'

interface IncidentTimelineProps {
  incident: Incident
  className?: string
  locale?: string
}

interface TimelineStageProps {
  stage: TimelineStage
  index: number
  totalStages: number
  isExpanded: boolean
  onToggle: () => void
}

function StageNode({ status, isCurrent, isResolved }: { status: IncidentStatus; isCurrent: boolean; isResolved: boolean }) {
  const nodeClasses = cn(
    'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
    isCurrent && 'ring-2 ring-offset-2 ring-primary scale-110',
    status === 'investigating' && 'border-yellow-500 bg-yellow-50',
    status === 'identified' && 'border-orange-500 bg-orange-50',
    status === 'monitoring' && 'border-blue-500 bg-blue-50',
    status === 'resolved' && 'border-green-500 bg-green-50',
    isCurrent && status === 'investigating' && 'ring-yellow-500',
    isCurrent && status === 'identified' && 'ring-orange-500',
    isCurrent && status === 'monitoring' && 'ring-blue-500',
    isCurrent && status === 'resolved' && 'ring-green-500',
  )

  const dotClasses = cn(
    'h-3 w-3 rounded-full',
    status === 'investigating' && 'bg-yellow-500',
    status === 'identified' && 'bg-orange-500',
    status === 'monitoring' && 'bg-blue-500',
    status === 'resolved' && 'bg-green-500',
  )

  return (
    <div className={nodeClasses}>
      <div className={dotClasses} />
    </div>
  )
}

function TimelineStageComponent({ stage, index, totalStages, isExpanded, onToggle }: TimelineStageProps) {
  const hasUpdates = stage.updates.length > 0
  const stageId = `stage-${stage.status}-${index}`

  return (
    <div className="relative flex gap-4" data-stage={stage.status} data-testid={`timeline-stage-${index}`}>
      {/* Connector line */}
      {index < totalStages - 1 && (
        <div 
          className="absolute left-4 top-8 h-[calc(100%-2rem)] w-px bg-border"
          aria-hidden="true"
        />
      )}

      {/* Node */}
      <div className="flex-shrink-0">
        <StageNode status={stage.status} isCurrent={stage.isCurrent} isResolved={stage.isResolved} />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <Collapsible open={isExpanded} onOpenChange={onToggle}>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                'group flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors',
                'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                stage.isCurrent && 'bg-muted/30'
              )}
              aria-expanded={isExpanded}
              aria-controls={`${stageId}-content`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('font-semibold', stage.isCurrent && 'text-primary')}>
                  {getStatusLabel(stage.status)}
                </span>
                {stage.isCurrent && (
                  <Badge variant="outline" className="text-xs">
                    Current
                  </Badge>
                )}
                <Badge 
                  variant="secondary" 
                  className={cn('text-xs font-mono', getStatusColor(stage.status))}
                >
                  {formatDurationShort(stage.duration)}
                </Badge>
                {hasUpdates && (
                  <span className="text-xs text-muted-foreground">
                    {stage.updates.length} update{stage.updates.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {formatTimestamp(stage.startTime)}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent id={`${stageId}-content`}>
            <div className="mt-2 space-y-3 pl-3">
              {/* Stage details */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-l-2 border-border pl-3">
                <div>
                  <span className="text-xs uppercase tracking-wider">Started</span>
                  <p className="font-medium text-foreground">{formatTimestamp(stage.startTime)}</p>
                </div>
                {stage.endTime ? (
                  <div>
                    <span className="text-xs uppercase tracking-wider">Ended</span>
                    <p className="font-medium text-foreground">{formatTimestamp(stage.endTime)}</p>
                  </div>
                ) : stage.isCurrent ? (
                  <div>
                    <span className="text-xs uppercase tracking-wider">Status</span>
                    <p className="font-medium text-foreground flex items-center gap-1">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                      </span>
                      Ongoing
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Updates */}
              <div className="space-y-2">
                {hasUpdates ? (
                  stage.updates.map((update, updateIndex) => (
                    <UpdateCard 
                      key={update.id} 
                      update={update} 
                      updateIndex={updateIndex}
                      stageId={stageId}
                    />
                  ))
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground border-l-2 border-border pl-3 py-2">
                    <AlertCircle className="h-4 w-4" />
                    No updates posted during this stage.
                  </div>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  )
}

interface UpdateCardProps {
  update: {
    id: string
    timestamp: Date | string
    title: string
    body: string
    createdBy?: string
  }
  updateIndex: number
  stageId: string
}

function UpdateCard({ update, updateIndex, stageId }: UpdateCardProps) {
  const updateId = `${stageId}-update-${update.id}`
  
  const copyLink = useCallback(() => {
    const url = new URL(window.location.href)
    url.hash = updateId
    navigator.clipboard.writeText(url.toString())
  }, [updateId])

  return (
    <div 
      id={updateId}
      className="group relative rounded-md border border-border bg-card p-3 transition-colors hover:bg-muted/30"
      data-testid={`update-card-${updateIndex}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <time dateTime={new Date(update.timestamp).toISOString()}>
              {formatTimestamp(update.timestamp)}
            </time>
            {update.createdBy && (
              <>
                <span>•</span>
                <span>{update.createdBy}</span>
              </>
            )}
          </div>
          <h4 className="font-medium text-sm text-foreground leading-tight">
            {update.title}
          </h4>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={copyLink}
          aria-label="Copy link to update"
        >
          <Link2 className="h-3 w-3" />
        </Button>
      </div>
      {update.body && (
        <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
          {update.body}
        </p>
      )}
    </div>
  )
}

export function IncidentTimeline({ incident, className, locale }: IncidentTimelineProps) {
  const [stages, setStages] = useState<TimelineStage[]>(() => buildTimelineStages(incident))
  const [expandedStages, setExpandedStages] = useState<Set<string>>(() => {
    // Default: expand current stage and most recent if resolved
    const resolved = isIncidentResolved(incident)
    const toExpand = new Set<string>()
    
    stages.forEach((stage, index) => {
      if (stage.isCurrent) {
        toExpand.add(`stage-${stage.status}-${index}`)
      }
      if (resolved && index === stages.length - 1) {
        toExpand.add(`stage-${stage.status}-${index}`)
      }
    })
    
    return toExpand
  })

  // Rebuild stages when incident changes
  useEffect(() => {
    setStages(buildTimelineStages(incident))
  }, [incident])

  // Update duration for ongoing stage every minute
  useEffect(() => {
    const hasOngoing = stages.some(s => s.isCurrent)
    if (!hasOngoing) return

    const interval = setInterval(() => {
      setStages(buildTimelineStages(incident))
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [incident, stages])

  const toggleStage = useCallback((stageKey: string) => {
    setExpandedStages(prev => {
      const next = new Set(prev)
      if (next.has(stageKey)) {
        next.delete(stageKey)
      } else {
        next.add(stageKey)
      }
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    const allKeys = stages.map((stage, index) => `stage-${stage.status}-${index}`)
    setExpandedStages(new Set(allKeys))
  }, [stages])

  const collapseAll = useCallback(() => {
    setExpandedStages(new Set())
  }, [])

  const isAllExpanded = expandedStages.size === stages.length
  const isAllCollapsed = expandedStages.size === 0

  const resolved = isIncidentResolved(incident)
  const totalDuration = calculateIncidentDuration(incident)

  if (stages.length === 0) {
    return (
      <div className={cn('rounded-lg border border-border bg-card p-6', className)}>
        <p className="text-muted-foreground text-center">No timeline data available.</p>
      </div>
    )
  }

  return (
    <div 
      className={cn('rounded-lg border border-border bg-card', className)}
      data-testid="incident-timeline"
      role="region"
      aria-label="Incident timeline"
    >
      {/* Header */}
      <div className="border-b border-border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Incident Timeline</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Started {formatTimestamp(incident.startAt, locale)}
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="font-medium text-foreground">
                {resolved ? (
                  <>Duration: {formatDurationShort(totalDuration)}</>
                ) : (
                  <>
                    Ongoing: {formatDurationShort(totalDuration)}
                    <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Expand/Collapse controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={expandAll}
              disabled={isAllExpanded}
              className="text-xs"
            >
              Expand all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={collapseAll}
              disabled={isAllCollapsed}
              className="text-xs"
            >
              Collapse all
            </Button>
          </div>
        </div>

        {/* Current status badge */}
        {!resolved && (
          <div className="mt-3">
            <Badge className={cn('text-xs', getStatusColor(incident.currentStatus))}>
              Current: {getStatusLabel(incident.currentStatus)}
            </Badge>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="p-4 sm:p-6">
        <div className="space-y-0">
          {stages.map((stage, index) => {
            const stageKey = `stage-${stage.status}-${index}`
            return (
              <TimelineStageComponent
                key={stageKey}
                stage={stage}
                index={index}
                totalStages={stages.length}
                isExpanded={expandedStages.has(stageKey)}
                onToggle={() => toggleStage(stageKey)}
              />
            )
          })}
        </div>
      </div>

      {/* Footer with summary */}
      <div className="border-t border-border px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {stages.length} stage{stages.length !== 1 ? 's' : ''} • {incident.updates.length} update{incident.updates.length !== 1 ? 's' : ''}
          </span>
          {resolved && incident.resolvedAt && (
            <span>
              Resolved {formatTimestamp(incident.resolvedAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
