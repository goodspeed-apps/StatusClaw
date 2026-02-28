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
import { useTaskShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { User, Tag, Flag, ArrowRight, Save, Command, X } from "lucide-react"

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-muted-foreground/15 text-muted-foreground" },
  medium: { label: "Medium", className: "bg-chart-1/15 text-chart-1" },
  high: { label: "High", className: "bg-chart-3/15 text-chart-3" },
  critical: { label: "Critical", className: "bg-destructive/15 text-destructive-foreground" },
}

const DEFAULT_TAGS = ["engineering", "ai", "marketing", "security", "design", "research", "testing", "product"]

interface CreateTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (task: Task) => void
}

interface NewTaskForm {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assignee: string
  tags: string[]
}

export function CreateTaskModal({
  open,
  onOpenChange,
  onCreate,
}: CreateTaskModalProps) {
  const [form, setForm] = useState<NewTaskForm>({
    title: "",
    description: "",
    status: "backlog",
    priority: "medium",
    assignee: agents[0]?.name || "",
    tags: [],
  })

  const statusConfig = TASK_STATUS_CONFIG[form.status]
  const priorityConfig = PRIORITY_CONFIG[form.priority]
  const isValid = form.title.trim().length > 0

  const handleCreate = () => {
    if (!isValid) return

    const newTask: Task = {
      id: `t${Date.now()}`,
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      assignee: form.assignee,
      createdAt: new Date().toISOString().split("T")[0],
      tags: form.tags,
      cost: 0,
      lastActivity: new Date().toISOString(),
    }

    onCreate(newTask)
    // Reset form
    setForm({
      title: "",
      description: "",
      status: "backlog",
      priority: "medium",
      assignee: agents[0]?.name || "",
      tags: [],
    })
  }

  // Setup keyboard shortcuts
  useTaskShortcuts({
    onSaveTask: () => {
      if (isValid && open) {
        handleCreate()
      }
    },
    onCancel: () => {
      if (open) {
        onOpenChange(false)
      }
    },
    canSave: isValid,
    modalOpen: open,
  })

  const toggleTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-border bg-card shadow-[0_0_30px_var(--glow-primary)]">
        <DialogHeader>
          <DialogTitle className="sr-only">Create New Task</DialogTitle>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <input
                placeholder="Task title..."
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full bg-transparent text-lg font-bold text-foreground outline-none border-b border-transparent focus:border-primary/40 transition-colors pb-1 placeholder:text-muted-foreground/50"
                autoFocus
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
            placeholder="What needs to be done?"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all resize-none leading-relaxed placeholder:text-muted-foreground/50"
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
              value={form.status}
              onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as TaskStatus }))}
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
              value={form.priority}
              onValueChange={(value) => setForm((prev) => ({ ...prev, priority: value as TaskPriority }))}
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
              value={form.assignee}
              onValueChange={(value) => setForm((prev) => ({ ...prev, assignee: value }))}
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

        {/* Tags */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Tag className="size-3" />
            Tags
          </label>
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer",
                  form.tags.includes(tag)
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Actions with Keyboard Shortcut Hints */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
            <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[9px] flex items-center gap-0.5">
              <Command className="size-2.5" />S
            </kbd>
            <span>to save</span>
            <span className="mx-1">·</span>
            <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[9px]">
              Esc
            </kbd>
            <span>to cancel</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onOpenChange(false)}
              variant="ghost"
              size="sm"
              className="gap-1.5"
            >
              <X className="size-3.5" />
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!isValid}
              size="sm"
              className="gap-1.5 shadow-[0_0_10px_var(--glow-primary)]"
            >
              <Save className="size-3.5" />
              Create Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
