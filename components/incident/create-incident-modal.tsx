"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Clock, User, Tag, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type IncidentPriority = "low" | "medium" | "high" | "critical"
export type IncidentStatus = "open" | "investigating" | "identified" | "monitoring" | "resolved"

interface CreateIncidentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (incident: IncidentData) => void
}

export interface IncidentData {
  title: string
  description: string
  priority: IncidentPriority
  status: IncidentStatus
  assignee: string
  tags: string[]
}

const PRIORITY_CONFIG: Record<IncidentPriority, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-muted-foreground/15 text-muted-foreground" },
  medium: { label: "Medium", className: "bg-chart-1/15 text-chart-1" },
  high: { label: "High", className: "bg-chart-3/15 text-chart-3" },
  critical: { label: "Critical", className: "bg-destructive/15 text-destructive-foreground" },
}

const STATUS_CONFIG: Record<IncidentStatus, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-chart-5/20 text-chart-5" },
  investigating: { label: "Investigating", color: "bg-chart-1/20 text-chart-1" },
  identified: { label: "Identified", color: "bg-chart-3/20 text-chart-3" },
  monitoring: { label: "Monitoring", color: "bg-accent/20 text-accent" },
  resolved: { label: "Resolved", color: "bg-muted/20 text-muted-foreground" },
}

const MOCK_ASSIGNEES = [
  "Unassigned",
  "Alice Johnson",
  "Bob Smith",
  "Carol Williams",
  "David Brown",
]

const COMMON_TAGS = ["api", "database", "frontend", "infrastructure", "security", "performance"]

export function CreateIncidentModal({ open, onOpenChange, onSubmit }: CreateIncidentModalProps) {
  const [formData, setFormData] = useState<IncidentData>({
    title: "",
    description: "",
    priority: "medium",
    status: "open",
    assignee: "Unassigned",
    tags: [],
  })
  const [tagInput, setTagInput] = useState("")
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Focus title field when modal opens
  useEffect(() => {
    if (open) {
      // Small delay to ensure modal is rendered
      const timer = setTimeout(() => {
        titleInputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        status: "open",
        assignee: "Unassigned",
        tags: [],
      })
      setTagInput("")
    }
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return
    onSubmit?.(formData)
    onOpenChange(false)
  }

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase()
    if (trimmed && !formData.tags.includes(trimmed)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, trimmed] }))
    }
    setTagInput("")
  }

  const removeTag = (tag: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === "Backspace" && !tagInput && formData.tags.length > 0) {
      removeTag(formData.tags[formData.tags.length - 1])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xl border-border bg-card"
        aria-labelledby="create-incident-title"
        aria-describedby="create-incident-description"
      >
        <DialogHeader>
          <DialogTitle id="create-incident-title" className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            Create New Incident
          </DialogTitle>
          <DialogDescription id="create-incident-description">
            Report a new incident to track and resolve.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="incident-title" className="text-sm font-medium">
              Incident Title <span className="text-destructive">*</span>
            </Label>
            <Input
              ref={titleInputRef}
              id="incident-title"
              data-testid="incident-title-input"
              placeholder="Enter incident title..."
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="incident-description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="incident-description"
              data-testid="incident-description-input"
              placeholder="Describe the incident, impact, and any initial observations..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full resize-none"
            />
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="incident-priority" className="text-sm font-medium flex items-center gap-1.5">
                <AlertTriangle className="size-3.5" />
                Priority
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, priority: value as IncidentPriority }))
                }
              >
                <SelectTrigger id="incident-priority" data-testid="incident-priority-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <Badge variant="secondary" className={cn("rounded-sm text-[10px] font-semibold border-0", config.className)}>
                        {config.label}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="incident-status" className="text-sm font-medium flex items-center gap-1.5">
                <Clock className="size-3.5" />
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, status: value as IncidentStatus }))
                }
              >
                <SelectTrigger id="incident-status" data-testid="incident-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className={cn("inline-block px-2 py-0.5 rounded text-[10px] font-medium", config.color)}>
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label htmlFor="incident-assignee" className="text-sm font-medium flex items-center gap-1.5">
              <User className="size-3.5" />
              Assignee
            </Label>
            <Select
              value={formData.assignee}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, assignee: value }))}
            >
              <SelectTrigger id="incident-assignee" data-testid="incident-assignee-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOCK_ASSIGNEES.map((assignee) => (
                  <SelectItem key={assignee} value={assignee}>
                    {assignee}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="incident-tags" className="text-sm font-medium flex items-center gap-1.5">
              <Tag className="size-3.5" />
              Tags
            </Label>
            <div className="space-y-2">
              <Input
                id="incident-tags"
                data-testid="incident-tags-input"
                placeholder="Type tag and press Enter..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
              />
              <div className="flex flex-wrap gap-1.5">
                {formData.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 px-2 py-0.5 text-[11px] cursor-pointer hover:bg-destructive/20"
                    onClick={() => removeTag(tag)}
                  >
                    {tag}
                    <X className="size-3" />
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {COMMON_TAGS.filter((t) => !formData.tags.includes(t)).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    className="text-[10px] px-2 py-0.5 rounded bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              data-testid="cancel-incident-btn"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.title.trim()}
              data-testid="create-incident-submit-btn"
            >
              Create Incident
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}