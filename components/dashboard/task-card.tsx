"use client"

import { cn } from "@/lib/utils"
import type { Task } from "@/lib/mock-data"
import { TASK_STATUS_CONFIG } from "@/lib/mock-data"
import { Badge } from "@/components/ui/badge"
import { formatSpend } from "./spend-display"
import { GripVertical, User, Calendar, DollarSign, Clock } from "lucide-react"

const PRIORITY_CONFIG = {
  low: "bg-muted-foreground/15 text-muted-foreground",
  medium: "bg-chart-1/15 text-chart-1",
  high: "bg-chart-3/15 text-chart-3",
  critical: "bg-destructive/15 text-destructive-foreground",
} as const

function formatRelativeTime(isoString: string): string {
  const now = new Date("2026-02-26T16:00:00Z")
  const date = new Date(isoString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  return `${diffDays}d ago`
}

export function TaskCard({
  task,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  task: Task
  onDragStart?: (e: React.DragEvent, task: Task) => void
  onDragEnd?: (e: React.DragEvent) => void
  onClick?: (task: Task) => void
}) {
  const relativeActivity = formatRelativeTime(task.lastActivity)

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, task)}
      onDragEnd={(e) => onDragEnd?.(e)}
      onClick={() => onClick?.(task)}
      className={cn(
        "group cursor-grab rounded-lg border border-border bg-card p-3 transition-all duration-200",
        "hover:shadow-md hover:border-primary/30 active:cursor-grabbing",
        "active:shadow-[0_0_15px_var(--glow-primary)]"
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold leading-snug text-foreground">
            {task.title}
          </h4>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {task.description}
          </p>

          {/* Tags */}
          <div className="mt-2 flex flex-wrap gap-1">
            {task.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-sm bg-secondary/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Meta row 1: priority + cost */}
          <div className="mt-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  "rounded-sm px-1.5 py-0 text-[10px] font-semibold uppercase border-0",
                  PRIORITY_CONFIG[task.priority]
                )}
              >
                {task.priority}
              </Badge>
              {task.cost > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground">
                  <DollarSign className="size-2.5" />
                  {formatSpend(task.cost)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <User className="size-2.5" />
                <span className="text-[10px] font-medium">{task.assignee}</span>
              </div>
            </div>
          </div>

          {/* Meta row 2: created + last activity */}
          <div className="mt-1.5 flex items-center justify-between text-muted-foreground/70">
            <div className="flex items-center gap-1">
              <Calendar className="size-2.5" />
              <span className="text-[10px] font-mono">
                {task.createdAt.slice(5)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="size-2.5" />
              <span className="text-[10px] font-mono">
                {relativeActivity}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


