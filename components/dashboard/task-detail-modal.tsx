"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Task, TaskStatus, TaskPriority } from "@/lib/mock-data"
import { TASK_STATUS_CONFIG, agents } from "@/lib/mock-data"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar, User, Tag, Flag, ArrowRight, Save, DollarSign, Clock } from "lucide-react"

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-muted-foreground/15 text-muted-foreground" },
  medium: { label: "Medium", className: "bg-chart-1/15 text-chart-1" },
  high: { label: "High", className: "bg-chart-3/15 text-chart-3" },
  critical: { label: "Critical", className: "bg-destructive/15 text-destructive-foreground" },
}

interface TaskDetailModalProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (task: Task) => void
}

export function TaskDetailModal({
  task,
  open,
  onOpenChange,
  onSave,
}: TaskDetailModalProps) {
  const [editedTask, setEditedTask] = useState<Task | null>(null)

  const currentTask = editedTask ?? task
  if (!currentTask) return null

  const statusConfig = TASK_STATUS_CONFIG[currentTask.status]
  const priorityConfig = PRIORITY_CONFIG[currentTask.priority]
  const hasChanges = editedTask !== null

  const handleStatusChange = (value: string) => {
    setEditedTask({ ...(editedTask ?? task!), status: value as TaskStatus })
  }

  const handlePriorityChange = (value: string) => {
    setEditedTask({ ...(editedTask ?? task!), priority: value as TaskPriority })
  }

  const handleAssigneeChange = (value: string) => {
    setEditedTask({ ...(editedTask ?? task!), assignee: value })
  }

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedTask({ ...(editedTask ?? task!), description: e.target.value })
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTask({ ...(editedTask ?? task!), title: e.target.value })
  }

  const handleSave = () => {
    if (editedTask) {
      onSave(editedTask)
      setEditedTask(null)
    }
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) setEditedTask(null)
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg border-border bg-card shadow-[0_0_30px_var(--glow-primary)]">
        <DialogHeader>
          <DialogTitle className="sr-only">Task Details</DialogTitle>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <input
                value={currentTask.title}
                onChange={handleTitleChange}
                className="w-full bg-transparent text-lg font-bold text-foreground outline-none border-b border-transparent focus:border-primary/40 transition-colors pb-1"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className={cn("rounded-md text-[11px] font-medium border-0", statusConfig.color)}
                >
                  {statusConfig.label}
                </Badge>
                <Badge
                  variant="secondary"
                  className={cn("rounded-sm text-[10px] font-semibold uppercase border-0", priorityConfig.className)}
                >
                  {priorityConfig.label}
                </Badge>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Calendar className="size-3" />
                  <span className="font-mono">{currentTask.createdAt}</span>
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Description
          </label>
          <textarea
            value={currentTask.description}
            onChange={handleDescriptionChange}
            rows={3}
            className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all resize-none leading-relaxed"
          />
        </div>

        {/* Editable Fields */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Status */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <ArrowRight className="size-3" />
              Status
            </label>
            <Select
              value={currentTask.status}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="h-8 w-full text-xs bg-secondary/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TASK_STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Flag className="size-3" />
              Priority
            </label>
            <Select
              value={currentTask.priority}
              onValueChange={handlePriorityChange}
            >
              <SelectTrigger className="h-8 w-full text-xs bg-secondary/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignee */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <User className="size-3" />
              Assignee
            </label>
            <Select
              value={currentTask.assignee}
              onValueChange={handleAssigneeChange}
            >
              <SelectTrigger className="h-8 w-full text-xs bg-secondary/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.name} className="text-xs">
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cost & Last Activity */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-secondary/20 px-3 py-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              <DollarSign className="size-3" />
              Cost
            </div>
            <p className="font-mono text-sm font-semibold text-foreground">
              ${currentTask.cost.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/20 px-3 py-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              <Clock className="size-3" />
              Last Activity
            </div>
            <p className="font-mono text-sm font-semibold text-foreground">
              {new Date(currentTask.lastActivity).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {" "}
              {new Date(currentTask.lastActivity).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Tag className="size-3" />
            Tags
          </label>
          <div className="flex flex-wrap gap-1.5">
            {currentTask.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-secondary/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Save Button */}
        {hasChanges && (
          <div className="flex justify-end pt-1">
            <Button
              onClick={handleSave}
              size="sm"
              className="gap-1.5 shadow-[0_0_10px_var(--glow-primary)]"
            >
              <Save className="size-3.5" />
              Save Changes
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
