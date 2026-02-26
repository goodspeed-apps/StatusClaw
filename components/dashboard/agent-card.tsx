"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Agent, Task, AgentFile } from "@/lib/mock-data"
import { tasks as allTasks, TASK_STATUS_CONFIG } from "@/lib/mock-data"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { SpendDisplay, formatSpend } from "./spend-display"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Cpu,
  Pause,
  Activity,
  ChevronDown,
  ChevronRight,
  Calendar,
  DollarSign,
  Clock,
  FileText,
  ListTodo,
  Timer,
  Play,
  CheckCircle2,
  XCircle,
  Save,
  X,
} from "lucide-react"
import Image from "next/image"

const STATUS_CONFIG = {
  active: {
    label: "Active",
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    rowBorder: "border-l-emerald-500",
    icon: Activity,
  },
  idle: {
    label: "Idle",
    badgeClass: "bg-zinc-400/15 text-zinc-500 dark:text-zinc-400",
    rowBorder: "border-l-zinc-400 dark:border-l-zinc-500",
    icon: Pause,
  },
  offline: {
    label: "Offline",
    badgeClass: "bg-zinc-400/15 text-zinc-500",
    rowBorder: "border-l-zinc-300 dark:border-l-zinc-600",
    icon: Pause,
  },
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

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Mock file content for demo purposes
function getMockFileContent(fileName: string): string {
  const contents: Record<string, string> = {
    "AGENTS.md": `# Agent Registry\n\nThis file defines the available agents and their capabilities.\n\n## Active Agents\n- Atlas (orchestrator)\n- backend_eng\n- web_eng\n\n## Capabilities\nEach agent has specific tools and permissions.`,
    "SOUL.md": `# Agent Soul\n\nCore personality traits and behavioral guidelines.\n\n## Principles\n1. Be helpful and accurate\n2. Prioritize user goals\n3. Communicate clearly\n\n## Constraints\n- Always verify before destructive actions\n- Respect rate limits`,
    "TOOLS.md": `# Available Tools\n\n## MCP Integrations\n- GitHub\n- Linear\n- Slack\n\n## Custom Tools\n- Code execution\n- File management\n- API requests`,
    "IDENTITY.md": `# Agent Identity\n\n## Authentication\nAPI keys and tokens managed via secure vault.\n\n## Permissions\nRole-based access control per agent.`,
    "USER.md": `# User Context\n\n## Preferences\n- Response style: concise\n- Code style: TypeScript\n- Framework: Next.js\n\n## History\nRecent interactions and learnings.`,
    "HEARTBEAT.md": `# Health Monitoring\n\n## Metrics\n- Response latency\n- Error rates\n- Token usage\n\n## Alerts\nConfigured thresholds for notifications.`,
    "BOOTSTRAP.md": `# Bootstrap Configuration\n\n## Startup Sequence\n1. Load environment\n2. Initialize connections\n3. Verify health\n4. Ready for tasks`,
    "MEMORY.md": `# Long-term Memory\n\n## Vector Store\nSemantic search over past conversations.\n\n## Key-Value Store\nImportant facts and decisions.\n\n## Expiration\nAuto-cleanup after 90 days of inactivity.`,
  }
  return contents[fileName] || `# ${fileName}\n\nFile content not available.`
}

function FileRow({
  file,
  isExpanded,
  onToggle,
}: {
  file: AgentFile
  isExpanded: boolean
  onToggle: () => void
}) {
  const [content, setContent] = useState(getMockFileContent(file.name))
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(content)

  const handleSave = () => {
    setContent(editedContent)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedContent(content)
    setIsEditing(false)
  }

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden shrink-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-secondary/40 transition-colors cursor-pointer text-left"
      >
        {isExpanded ? (
          <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
        )}
        <FileText className="size-3.5 text-primary shrink-0" />
        <span className="font-mono text-xs font-semibold text-foreground shrink-0">{file.name}</span>
        <span className="text-[10px] text-muted-foreground truncate flex-1 min-w-0 hidden sm:block">
          {file.description}
        </span>
        <span className="text-[9px] text-muted-foreground/60 shrink-0 ml-auto">
          {formatRelativeTime(file.lastModified)}
        </span>
      </button>
      
      {isExpanded && (
        <div className="border-t border-border bg-secondary/20 p-3">
          <p className="text-[10px] text-muted-foreground mb-2 sm:hidden">{file.description}</p>
          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="font-mono text-xs min-h-[280px] bg-background resize-y"
              />
              <div className="flex items-center gap-2 justify-end pt-1 border-t border-border">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  className="h-8 text-xs cursor-pointer gap-1.5"
                >
                  <X className="size-3.5" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="h-8 text-xs cursor-pointer gap-1.5"
                >
                  <Save className="size-3.5" />
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <pre className="font-mono text-[11px] text-foreground/80 whitespace-pre-wrap bg-background rounded-md p-3 border border-border min-h-[200px] max-h-[320px] overflow-auto">
                {content}
              </pre>
              <div className="flex justify-end pt-1 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="h-8 text-xs cursor-pointer gap-1.5"
                >
                  <FileText className="size-3.5" />
                  Edit File
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function AgentRow({
  agent,
  onTaskClick,
}: {
  agent: Agent
  onTaskClick?: (task: Task) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState("spend")
  const [expandedFileIndex, setExpandedFileIndex] = useState<number | null>(null)
  const statusConfig = STATUS_CONFIG[agent.status]
  const StatusIcon = statusConfig.icon

  // Get all tasks assigned to this agent, sorted: active first, then by lastActivity desc
  const agentTasks = allTasks
    .filter(
      (t) =>
        t.assignee.toLowerCase() === agent.name.toLowerCase() ||
        t.assignee.toLowerCase() === agent.id.toLowerCase()
    )
    .sort((a, b) => {
      const activeStatuses = ["in-progress", "in-testing", "in-marketing"]
      const aActive = activeStatuses.includes(a.status) ? 0 : 1
      const bActive = activeStatuses.includes(b.status) ? 0 : 1
      if (aActive !== bActive) return aActive - bActive
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    })

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card transition-all duration-200 border-l-[3px] overflow-hidden",
        statusConfig.rowBorder,
        agent.status === "active" && "hover:shadow-[0_2px_12px_var(--glow-primary)]"
      )}
    >
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-3 py-3 cursor-pointer sm:gap-4 sm:px-4"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        {/* Avatar */}
        <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg sm:size-11">
          <Image
            src={agent.avatar}
            alt={`${agent.name} avatar`}
            width={44}
            height={44}
            className="size-full object-cover"
          />
        </div>

        {/* Name & Role */}
        <div className="min-w-0 flex-1 sm:flex-none sm:w-36">
          <h3 className="text-sm font-semibold text-foreground truncate">{agent.name}</h3>
          <p className="text-[11px] text-muted-foreground truncate">{agent.role}</p>
        </div>

        {/* Status badge */}
        <div className="hidden w-20 shrink-0 sm:block">
          <Badge
            variant="secondary"
            className={cn(
              "rounded-md text-[10px] font-semibold border-0 gap-1",
              statusConfig.badgeClass
            )}
          >
            <StatusIcon className="size-2.5" />
            {statusConfig.label}
          </Badge>
        </div>

        {/* Model */}
        <div className="hidden w-32 shrink-0 items-center gap-1.5 md:flex">
          <Cpu className="size-3 text-muted-foreground" />
          <span className="font-mono text-[11px] text-muted-foreground truncate">
            {agent.model}
          </span>
        </div>

        {/* Current Tasks (clickable) */}
        <div className="hidden min-w-0 flex-1 lg:block">
          {agent.currentTasks.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {agent.currentTasks.map((taskTitle) => (
                <button
                  key={taskTitle}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onTaskClick) {
                      const match = allTasks.find((t) => t.title === taskTitle)
                      if (match) onTaskClick(match)
                    }
                  }}
                  className={cn(
                    "rounded-md bg-primary/10 text-primary text-[10px] font-medium px-2 py-0.5 truncate max-w-48",
                    "hover:bg-primary/20 hover:shadow-[0_0_6px_var(--glow-primary)] transition-all cursor-pointer"
                  )}
                >
                  {taskTitle}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-[11px] italic text-muted-foreground/50">
              No active tasks
            </span>
          )}
        </div>

        {/* Compact spend (xl only) */}
        <div className="ml-auto hidden items-center gap-3 xl:flex">
          {[
            { label: "24h", value: agent.spend.day },
            { label: "7d", value: agent.spend.week },
            { label: "30d", value: agent.spend.month },
            { label: "Total", value: agent.spend.total },
          ].map((p) => (
            <div key={p.label} className="text-right">
              <p className="text-[9px] uppercase text-muted-foreground/70">{p.label}</p>
              <p className="font-mono text-xs font-semibold text-foreground">{formatSpend(p.value)}</p>
            </div>
          ))}
        </div>

        {/* Chevron */}
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-180"
          )}
        />
      </div>

      {/* Expanded panel with tabs */}
      {expanded && (
        <div className="border-t border-border bg-secondary/10 px-3 py-3 sm:px-4">
          {/* Mobile-only: show status */}
          <div className="flex flex-wrap items-center gap-2 mb-3 sm:hidden">
            <Badge
              variant="secondary"
              className={cn("rounded-md text-[10px] font-semibold border-0 gap-1", statusConfig.badgeClass)}
            >
              <StatusIcon className="size-2.5" />
              {statusConfig.label}
            </Badge>
            <span className="font-mono text-[11px] text-muted-foreground">
              Total: {formatSpend(agent.spend.total)}
            </span>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="h-8 bg-secondary/50 border border-border p-0.5 mb-3 w-full sm:w-auto">
              <TabsTrigger value="spend" className="gap-1 text-[10px] px-2 h-7 cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <DollarSign className="size-3" />
                <span className="hidden sm:inline">Spend</span>
              </TabsTrigger>
              <TabsTrigger value="tasks" className="gap-1 text-[10px] px-2 h-7 cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <ListTodo className="size-3" />
                <span className="hidden sm:inline">Tasks</span>
                <span className="ml-0.5 text-[9px] opacity-70">({agentTasks.length})</span>
              </TabsTrigger>
              <TabsTrigger value="files" className="gap-1 text-[10px] px-2 h-7 cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileText className="size-3" />
                <span className="hidden sm:inline">Files</span>
                <span className="ml-0.5 text-[9px] opacity-70">({agent.files.length})</span>
              </TabsTrigger>
              <TabsTrigger value="crons" className="gap-1 text-[10px] px-2 h-7 cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Timer className="size-3" />
                <span className="hidden sm:inline">Cron Jobs</span>
                <span className="ml-0.5 text-[9px] opacity-70">({agent.cronJobs.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* Spend Tab */}
            <TabsContent value="spend" className="mt-0">
              <SpendDisplay spend={agent.spend} compact />
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="mt-0">
              {agentTasks.length === 0 ? (
                <p className="text-xs italic text-muted-foreground/50 py-2">No tasks assigned.</p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                  {agentTasks.map((task) => {
                    const sConfig = TASK_STATUS_CONFIG[task.status]
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => onTaskClick?.(task)}
                        className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-left transition-all hover:bg-secondary/40 hover:shadow-sm cursor-pointer w-full"
                      >
                        <Badge
                          variant="secondary"
                          className={cn("rounded-sm text-[9px] font-semibold border-0 shrink-0", sConfig.color)}
                        >
                          {sConfig.label}
                        </Badge>
                        <span className="text-xs font-medium text-foreground truncate flex-1 min-w-0">{task.title}</span>
                        <div className="hidden items-center gap-3 text-[10px] text-muted-foreground sm:flex">
                          <span className="flex items-center gap-1 font-mono">
                            <DollarSign className="size-2.5" />
                            {formatSpend(task.cost)}
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="size-2.5" />
                            {formatRelativeTime(task.lastActivity)}
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="size-2.5" />
                            {task.createdAt.slice(5)}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="mt-0">
              {agent.files.length === 0 ? (
                <p className="text-xs italic text-muted-foreground/50 py-2">No files configured.</p>
              ) : (
                <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                  {agent.files.map((file, index) => (
                    <FileRow
                      key={file.name}
                      file={file}
                      isExpanded={expandedFileIndex === index}
                      onToggle={() => setExpandedFileIndex(expandedFileIndex === index ? null : index)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Cron Jobs Tab */}
            <TabsContent value="crons" className="mt-0">
              {agent.cronJobs.length === 0 ? (
                <p className="text-xs italic text-muted-foreground/50 py-2">No cron jobs configured.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {agent.cronJobs.map((cron) => (
                    <div
                      key={cron.name}
                      className={cn(
                        "rounded-md border bg-card px-3 py-2 flex flex-col sm:flex-row sm:items-center gap-2",
                        cron.enabled ? "border-border" : "border-destructive/30 opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {cron.enabled ? (
                          <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="size-3.5 text-destructive shrink-0" />
                        )}
                        <span className="font-mono text-xs font-semibold text-foreground truncate">{cron.name}</span>
                        <code className="rounded bg-secondary px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground shrink-0">
                          {cron.schedule}
                        </code>
                      </div>
                      <p className="text-[10px] text-muted-foreground flex-1 min-w-0 truncate hidden lg:block">
                        {cron.description}
                      </p>
                      <div className="flex items-center gap-3 text-[9px] text-muted-foreground/70 shrink-0">
                        <span className="flex items-center gap-1">
                          <Play className="size-2.5" />
                          Last: {formatRelativeTime(cron.lastRun)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-2.5" />
                          Next: {formatDate(cron.nextRun)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
