"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Clock, User, Tag, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { SeverityLevel } from "@/lib/severity-level-store"

export type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved"

interface CreateIncidentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (incident: IncidentData) => void
}

export interface IncidentData {
  title: string
  description: string
  severity: string
  status: IncidentStatus
  service: string
  assignee: string
  tags: string[]
}

const STATUS_CONFIG: Record<IncidentStatus, { label: string; color: string }> = {
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

const COMMON_SERVICES = ["API", "Auth", "Database", "Frontend", "Infrastructure", "Payments"]
const COMMON_TAGS = ["api", "database", "frontend", "infrastructure", "security", "performance"]

export function CreateIncidentModal({ open, onOpenChange, onSubmit }: CreateIncidentModalProps) {
  const [severityLevels, setSeverityLevels] = useState<SeverityLevel[]>([])
  const [isLoadingSeverities, setIsLoadingSeverities] = useState(true)
  const [formData, setFormData] = useState<IncidentData>({
    title: "",
    description: "",
    severity: "",
    status: "investigating",
    service: "API",
    assignee: "Unassigned",
    tags: [],
  })
  const [tagInput, setTagInput] = useState("")
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Fetch severity levels on mount
  const fetchSeverityLevels = useCallback(async () => {
    setIsLoadingSeverities(true)
    try {
      const response = await fetch('/api/severity-levels')
      if (response.ok) {
        const data = await response.json()
        setSeverityLevels(data.levels)
        // Set default severity
        const defaultLevel = data.levels.find((l: SeverityLevel) => l.isDefault) || data.levels[0]
        if (defaultLevel) {
          setFormData(prev => ({ ...prev, severity: defaultLevel.slug }))
        }
      } else {
        toast.error('Failed to load severity levels')
      }
    } catch (error) {
      console.error('Failed to fetch severity levels:', error)
      toast.error('Failed to load severity levels')
    } finally {
      setIsLoadingSeverities(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchSeverityLevels()
    }
  }, [open, fetchSeverityLevels])

  // Focus title field when modal opens
  useEffect(() => {
    if (open) {
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
        severity: "",
        status: "investigating",
        service: "API",
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

  const getSeverityConfig = (slug: string) => {
    const level = severityLevels.find(l => l.slug === slug)
    if (!level) return { label: slug, color: "bg-muted-foreground/15 text-muted-foreground", icon: AlertTriangle }
    return {
      label: level.name,
      color: level.color,
      bgColor: `${level.color}20`,
      icon: AlertTriangle,
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

          {/* Severity & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="incident-severity" className="text-sm font-medium flex items-center gap-1.5">
                <AlertTriangle className="size-3.5" />
                Severity
              </Label>
              <Select
                value={formData.severity}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, severity: value }))
                }
                disabled={isLoadingSeverities}
              >
                <SelectTrigger id="incident-severity" data-testid="incident-severity-select">
                  {isLoadingSeverities ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <SelectValue />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {severityLevels.sort((a, b) => a.order - b.order).map((level) => (
                    <SelectItem key={level.id} value={level.slug}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: level.color }}
                        />
                        <span>{level.name}</span>
                        {level.pagesOnCall && (
                          <Badge variant="destructive" className="text-[9px] px-1 py-0">Pages</Badge>
                        )}
                      </div>
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

          {/* Service & Assignee */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="incident-service" className="text-sm font-medium">
                Service
              </Label>
              <Select
                value={formData.service}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, service: value }))}
              >
                <SelectTrigger id="incident-service" data-testid="incident-service-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_SERVICES.map((service) => (
                    <SelectItem key={service} value={service}>
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
              disabled={!formData.title.trim() || isLoadingSeverities || !formData.severity}
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
