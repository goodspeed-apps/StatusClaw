export interface AgentFile {
  name: string
  description: string
  lastModified: string
}

export interface CronJob {
  name: string
  schedule: string
  description: string
  lastRun: string
  nextRun: string
  enabled: boolean
}

export interface Agent {
  id: string
  name: string
  role: string
  status: "active" | "idle" | "offline"
  model: string
  currentTasks: string[]
  spend: {
    day: number
    week: number
    month: number
    total: number
  }
  avatar: string
  files: AgentFile[]
  cronJobs: CronJob[]
}

export interface LLMModel {
  id: string
  name: string
  provider: string
  avatar: string
  spend: {
    day: number
    week: number
    month: number
    total: number
  }
  agentCount: number
}

export type TaskStatus =
  | "backlog"
  | "on-deck"
  | "in-progress"
  | "in-testing"
  | "in-marketing"
  | "done"
  | "parking-lot"

export type TaskPriority = "low" | "medium" | "high" | "critical"

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assignee: string
  createdAt: string
  tags: string[]
  cost: number
  lastActivity: string
}

export const TASK_STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string; glowColor: string }
> = {
  backlog: {
    label: "Backlog",
    color: "bg-muted-foreground/20 text-muted-foreground",
    glowColor: "shadow-[0_0_8px_var(--glow-primary)]",
  },
  "on-deck": {
    label: "On Deck",
    color: "bg-chart-1/15 text-chart-1",
    glowColor: "shadow-[0_0_8px_var(--glow-primary)]",
  },
  "in-progress": {
    label: "In Progress",
    color: "bg-accent/15 text-accent",
    glowColor: "shadow-[0_0_8px_var(--glow-accent)]",
  },
  "in-testing": {
    label: "In Testing",
    color: "bg-chart-3/15 text-chart-3",
    glowColor: "shadow-[0_0_8px_var(--glow-warning)]",
  },
  "in-marketing": {
    label: "In Marketing",
    color: "bg-chart-4/15 text-chart-4",
    glowColor: "shadow-[0_0_8px_oklch(0.7_0.22_330_/_0.25)]",
  },
  done: {
    label: "Done",
    color: "bg-chart-2/15 text-chart-2",
    glowColor: "shadow-[0_0_8px_var(--glow-success)]",
  },
  "parking-lot": {
    label: "Parking Lot",
    color: "bg-chart-5/15 text-chart-5",
    glowColor: "shadow-[0_0_8px_oklch(0.65_0.2_30_/_0.25)]",
  },
}

export const TASK_COLUMNS: TaskStatus[] = [
  "backlog",
  "on-deck",
  "in-progress",
  "in-testing",
  "in-marketing",
  "done",
  "parking-lot",
]

export const agents: Agent[] = [
  {
    id: "atlas",
    name: "Atlas",
    role: "Primary Orchestrator",
    status: "active",
    model: "claude-opus-4",
    currentTasks: ["Task routing & delegation", "Sprint planning v3"],
    spend: { day: 14.20, week: 89.50, month: 362.80, total: 3247.50 },
    avatar: "/avatars/atlas.jpg",
    files: [
      { name: "AGENTS.md", description: "Team agents and capabilities registry", lastModified: "2026-02-25T10:30:00Z" },
      { name: "SOUL.md", description: "Core personality and behavioral guidelines", lastModified: "2026-02-20T14:15:00Z" },
      { name: "TOOLS.md", description: "Available tools and MCP integrations", lastModified: "2026-02-24T09:45:00Z" },
      { name: "IDENTITY.md", description: "Agent identity and authentication", lastModified: "2026-02-18T16:20:00Z" },
      { name: "USER.md", description: "User preferences and context", lastModified: "2026-02-26T08:00:00Z" },
      { name: "HEARTBEAT.md", description: "Health monitoring configuration", lastModified: "2026-02-22T11:30:00Z" },
      { name: "BOOTSTRAP.md", description: "Initialization and startup routines", lastModified: "2026-02-15T13:00:00Z" },
      { name: "MEMORY.md", description: "Long-term memory and recall systems", lastModified: "2026-02-26T14:45:00Z" },
    ],
    cronJobs: [
      { name: "daily-standup", schedule: "0 9 * * *", description: "Generate daily team standup summary", lastRun: "2026-02-26T09:00:00Z", nextRun: "2026-02-27T09:00:00Z", enabled: true },
      { name: "task-rebalance", schedule: "0 */4 * * *", description: "Rebalance tasks across agents", lastRun: "2026-02-26T12:00:00Z", nextRun: "2026-02-26T16:00:00Z", enabled: true },
      { name: "weekly-report", schedule: "0 17 * * 5", description: "Generate weekly progress report", lastRun: "2026-02-21T17:00:00Z", nextRun: "2026-02-28T17:00:00Z", enabled: true },
    ],
  },
  {
    id: "architect",
    name: "architect",
    role: "System Architecture",
    status: "active",
    model: "claude-opus-4",
    currentTasks: ["Microservice topology redesign"],
    spend: { day: 9.80, week: 61.20, month: 248.40, total: 1823.20 },
    avatar: "/avatars/architect.jpg",
    files: [
      { name: "AGENTS.md", description: "Architecture team agents", lastModified: "2026-02-24T09:00:00Z" },
      { name: "SOUL.md", description: "Design principles and patterns", lastModified: "2026-02-19T11:30:00Z" },
      { name: "TOOLS.md", description: "Diagramming and documentation tools", lastModified: "2026-02-23T14:20:00Z" },
      { name: "IDENTITY.md", description: "System boundaries and ownership", lastModified: "2026-02-17T10:45:00Z" },
    ],
    cronJobs: [
      { name: "arch-review", schedule: "0 10 * * 1", description: "Weekly architecture review digest", lastRun: "2026-02-24T10:00:00Z", nextRun: "2026-03-03T10:00:00Z", enabled: true },
    ],
  },
  {
    id: "backend_eng",
    name: "backend_eng",
    role: "Backend Engineering",
    status: "active",
    model: "claude-sonnet-4",
    currentTasks: ["API endpoint refactor", "DB migration scripts"],
    spend: { day: 11.30, week: 72.40, month: 298.60, total: 2156.80 },
    avatar: "/avatars/backend_eng.jpg",
    files: [
      { name: "AGENTS.md", description: "Backend team structure", lastModified: "2026-02-23T08:30:00Z" },
      { name: "SOUL.md", description: "Code quality and review standards", lastModified: "2026-02-20T15:00:00Z" },
      { name: "TOOLS.md", description: "Dev tools, CI/CD, and testing frameworks", lastModified: "2026-02-25T11:20:00Z" },
      { name: "IDENTITY.md", description: "Service ownership matrix", lastModified: "2026-02-18T09:15:00Z" },
    ],
    cronJobs: [
      { name: "db-backup", schedule: "0 3 * * *", description: "Nightly database backup verification", lastRun: "2026-02-26T03:00:00Z", nextRun: "2026-02-27T03:00:00Z", enabled: true },
      { name: "dep-scan", schedule: "0 6 * * 1", description: "Weekly dependency vulnerability scan", lastRun: "2026-02-24T06:00:00Z", nextRun: "2026-03-03T06:00:00Z", enabled: true },
    ],
  },
  {
    id: "cfo",
    name: "cfo",
    role: "Financial Operations",
    status: "idle",
    model: "gpt-5-mini",
    currentTasks: [],
    spend: { day: 0.00, week: 18.90, month: 94.30, total: 687.40 },
    avatar: "/avatars/cfo.jpg",
    files: [
      { name: "AGENTS.md", description: "Finance team roster", lastModified: "2026-02-22T10:00:00Z" },
      { name: "SOUL.md", description: "Financial policies and compliance", lastModified: "2026-02-19T14:30:00Z" },
      { name: "TOOLS.md", description: "Accounting and reporting tools", lastModified: "2026-02-21T16:45:00Z" },
    ],
    cronJobs: [
      { name: "cost-report", schedule: "0 8 * * 1", description: "Weekly LLM cost summary", lastRun: "2026-02-24T08:00:00Z", nextRun: "2026-03-03T08:00:00Z", enabled: true },
      { name: "budget-alert", schedule: "0 */6 * * *", description: "Budget threshold monitoring", lastRun: "2026-02-26T12:00:00Z", nextRun: "2026-02-26T18:00:00Z", enabled: true },
    ],
  },
  {
    id: "cmo",
    name: "cmo",
    role: "Marketing Operations",
    status: "active",
    model: "claude-sonnet-4",
    currentTasks: ["Q1 campaign strategy"],
    spend: { day: 5.60, week: 34.80, month: 142.10, total: 921.30 },
    avatar: "/avatars/cmo.jpg",
    files: [
      { name: "AGENTS.md", description: "Marketing team members", lastModified: "2026-02-25T09:00:00Z" },
      { name: "SOUL.md", description: "Brand voice and messaging guidelines", lastModified: "2026-02-20T13:30:00Z" },
      { name: "TOOLS.md", description: "Content and analytics platforms", lastModified: "2026-02-24T11:15:00Z" },
    ],
    cronJobs: [
      { name: "social-digest", schedule: "0 7 * * *", description: "Daily social media metrics digest", lastRun: "2026-02-26T07:00:00Z", nextRun: "2026-02-27T07:00:00Z", enabled: true },
      { name: "content-calendar", schedule: "0 9 * * 1", description: "Weekly content calendar review", lastRun: "2026-02-24T09:00:00Z", nextRun: "2026-03-03T09:00:00Z", enabled: true },
    ],
  },
  {
    id: "cto",
    name: "cto",
    role: "Technical Leadership",
    status: "active",
    model: "claude-opus-4",
    currentTasks: ["Tech stack evaluation", "Architecture review"],
    spend: { day: 12.70, week: 82.30, month: 334.50, total: 2891.60 },
    avatar: "/avatars/cto.jpg",
    files: [
      { name: "AGENTS.md", description: "Engineering leadership roster", lastModified: "2026-02-25T10:00:00Z" },
      { name: "SOUL.md", description: "Technical vision and strategy", lastModified: "2026-02-21T14:00:00Z" },
      { name: "TOOLS.md", description: "Platform and infrastructure tooling", lastModified: "2026-02-24T16:30:00Z" },
      { name: "IDENTITY.md", description: "Tech org structure", lastModified: "2026-02-19T11:00:00Z" },
    ],
    cronJobs: [
      { name: "tech-radar", schedule: "0 10 1 * *", description: "Monthly tech radar update", lastRun: "2026-02-01T10:00:00Z", nextRun: "2026-03-01T10:00:00Z", enabled: true },
      { name: "incident-review", schedule: "0 14 * * 5", description: "Weekly incident retrospective", lastRun: "2026-02-21T14:00:00Z", nextRun: "2026-02-28T14:00:00Z", enabled: true },
    ],
  },
  {
    id: "pm",
    name: "pm",
    role: "Product Management",
    status: "active",
    model: "gpt-5-mini",
    currentTasks: ["Roadmap prioritization"],
    spend: { day: 4.90, week: 29.60, month: 118.70, total: 812.50 },
    avatar: "/avatars/pm.jpg",
    files: [
      { name: "AGENTS.md", description: "Product team members", lastModified: "2026-02-24T08:45:00Z" },
      { name: "SOUL.md", description: "Product principles and vision", lastModified: "2026-02-20T10:30:00Z" },
      { name: "TOOLS.md", description: "Roadmapping and analytics tools", lastModified: "2026-02-23T15:00:00Z" },
      { name: "USER.md", description: "User research insights", lastModified: "2026-02-26T09:30:00Z" },
    ],
    cronJobs: [
      { name: "roadmap-sync", schedule: "0 9 * * 1", description: "Weekly roadmap sync digest", lastRun: "2026-02-24T09:00:00Z", nextRun: "2026-03-03T09:00:00Z", enabled: true },
      { name: "feature-metrics", schedule: "0 8 * * *", description: "Daily feature usage metrics", lastRun: "2026-02-26T08:00:00Z", nextRun: "2026-02-27T08:00:00Z", enabled: true },
    ],
  },
  {
    id: "mobile_eng",
    name: "mobile_eng",
    role: "Mobile Engineering",
    status: "idle",
    model: "claude-sonnet-4",
    currentTasks: [],
    spend: { day: 0.00, week: 22.10, month: 108.40, total: 743.20 },
    avatar: "/avatars/mobile_eng.jpg",
    files: [
      { name: "AGENTS.md", description: "Mobile team structure", lastModified: "2026-02-23T10:15:00Z" },
      { name: "SOUL.md", description: "Mobile UX and performance standards", lastModified: "2026-02-19T13:45:00Z" },
      { name: "TOOLS.md", description: "Mobile dev and testing frameworks", lastModified: "2026-02-22T11:30:00Z" },
    ],
    cronJobs: [
      { name: "app-metrics", schedule: "0 7 * * *", description: "Daily app store metrics", lastRun: "2026-02-26T07:00:00Z", nextRun: "2026-02-27T07:00:00Z", enabled: true },
    ],
  },
  {
    id: "revenue_ops",
    name: "revenue_ops",
    role: "Revenue Operations",
    status: "active",
    model: "gpt-5-mini",
    currentTasks: ["Pipeline analytics dashboard"],
    spend: { day: 3.40, week: 21.80, month: 89.60, total: 534.70 },
    avatar: "/avatars/revenue_ops.jpg",
    files: [
      { name: "AGENTS.md", description: "RevOps team roster", lastModified: "2026-02-24T09:30:00Z" },
      { name: "SOUL.md", description: "Revenue operations playbook", lastModified: "2026-02-21T11:00:00Z" },
      { name: "TOOLS.md", description: "CRM and analytics integrations", lastModified: "2026-02-25T14:00:00Z" },
    ],
    cronJobs: [
      { name: "pipeline-sync", schedule: "0 6 * * *", description: "Daily pipeline data sync", lastRun: "2026-02-26T06:00:00Z", nextRun: "2026-02-27T06:00:00Z", enabled: true },
      { name: "forecast-update", schedule: "0 8 * * 1", description: "Weekly forecast refresh", lastRun: "2026-02-24T08:00:00Z", nextRun: "2026-03-03T08:00:00Z", enabled: true },
    ],
  },
  {
    id: "security",
    name: "security",
    role: "Security & Compliance",
    status: "active",
    model: "claude-opus-4",
    currentTasks: ["Penetration test analysis"],
    spend: { day: 7.20, week: 45.60, month: 186.30, total: 1342.90 },
    avatar: "/avatars/security.jpg",
    files: [
      { name: "AGENTS.md", description: "Security team members", lastModified: "2026-02-25T08:00:00Z" },
      { name: "SOUL.md", description: "Security policies and incident response", lastModified: "2026-02-22T10:30:00Z" },
      { name: "TOOLS.md", description: "Security scanning and monitoring tools", lastModified: "2026-02-24T13:15:00Z" },
      { name: "IDENTITY.md", description: "Access control and authentication", lastModified: "2026-02-20T15:45:00Z" },
    ],
    cronJobs: [
      { name: "vuln-scan", schedule: "0 2 * * *", description: "Nightly vulnerability scan", lastRun: "2026-02-26T02:00:00Z", nextRun: "2026-02-27T02:00:00Z", enabled: true },
      { name: "audit-log", schedule: "0 */2 * * *", description: "Bi-hourly audit log analysis", lastRun: "2026-02-26T14:00:00Z", nextRun: "2026-02-26T16:00:00Z", enabled: true },
      { name: "compliance-check", schedule: "0 9 * * 1", description: "Weekly compliance status check", lastRun: "2026-02-24T09:00:00Z", nextRun: "2026-03-03T09:00:00Z", enabled: true },
    ],
  },
  {
    id: "side_hustle_studio",
    name: "side_hustle_studio",
    role: "Creative Ventures",
    status: "idle",
    model: "gemini-3-flash",
    currentTasks: [],
    spend: { day: 0.00, week: 12.40, month: 56.80, total: 398.60 },
    avatar: "/avatars/side_hustle_studio.jpg",
    files: [
      { name: "AGENTS.md", description: "Creative team roster", lastModified: "2026-02-22T14:00:00Z" },
      { name: "SOUL.md", description: "Creative philosophy and brand guidelines", lastModified: "2026-02-18T16:30:00Z" },
      { name: "TOOLS.md", description: "Design and prototyping tools", lastModified: "2026-02-21T10:45:00Z" },
    ],
    cronJobs: [
      { name: "idea-digest", schedule: "0 10 * * 5", description: "Weekly idea backlog digest", lastRun: "2026-02-21T10:00:00Z", nextRun: "2026-02-28T10:00:00Z", enabled: true },
    ],
  },
  {
    id: "web_eng",
    name: "web_eng",
    role: "Web Engineering",
    status: "active",
    model: "claude-sonnet-4",
    currentTasks: ["StatusClaw dashboard", "Component library update"],
    spend: { day: 8.50, week: 54.30, month: 221.40, total: 1612.30 },
    avatar: "/avatars/web_eng.jpg",
    files: [
      { name: "AGENTS.md", description: "Web team members", lastModified: "2026-02-25T11:00:00Z" },
      { name: "SOUL.md", description: "Frontend standards and accessibility", lastModified: "2026-02-21T14:30:00Z" },
      { name: "TOOLS.md", description: "Build tools and component libraries", lastModified: "2026-02-26T09:00:00Z" },
      { name: "IDENTITY.md", description: "App routing and state management", lastModified: "2026-02-19T12:15:00Z" },
    ],
    cronJobs: [
      { name: "lighthouse", schedule: "0 5 * * *", description: "Daily Lighthouse performance audit", lastRun: "2026-02-26T05:00:00Z", nextRun: "2026-02-27T05:00:00Z", enabled: true },
      { name: "bundle-analysis", schedule: "0 6 * * 1", description: "Weekly bundle size analysis", lastRun: "2026-02-24T06:00:00Z", nextRun: "2026-03-03T06:00:00Z", enabled: true },
    ],
  },
]

export const models: LLMModel[] = [
  {
    id: "claude-opus-4",
    name: "Claude Opus 4",
    provider: "Anthropic",
    avatar: "/models/anthropic.jpg",
    spend: { day: 43.90, week: 278.60, month: 1131.00, total: 9305.20 },
    agentCount: 4,
  },
  {
    id: "claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "Anthropic",
    avatar: "/models/anthropic.jpg",
    spend: { day: 25.40, week: 183.60, month: 770.50, total: 5433.50 },
    agentCount: 4,
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "OpenAI",
    avatar: "/models/openai.jpg",
    spend: { day: 8.30, week: 70.30, month: 302.60, total: 2034.60 },
    agentCount: 3,
  },
  {
    id: "gemini-3-flash",
    name: "Gemini 3 Flash",
    provider: "Google",
    avatar: "/models/google.jpg",
    spend: { day: 0.00, week: 12.40, month: 56.80, total: 398.60 },
    agentCount: 1,
  },
]

// Historical spend data for charts (last 30 days)
export interface DailySpend {
  date: string
  total: number
  cumulative: number
  byAgent: Record<string, number>
  byModel: Record<string, number>
}

function generateHistory(): DailySpend[] {
  const agentIds = ["atlas","architect","backend_eng","cfo","cmo","cto","pm","mobile_eng","revenue_ops","security","side_hustle_studio","web_eng"]
  const baseSpend: Record<string, number> = { atlas: 12, architect: 8.5, backend_eng: 10.5, cfo: 1.5, cmo: 5, cto: 11, pm: 4, mobile_eng: 2, revenue_ops: 3, security: 6.5, side_hustle_studio: 1.2, web_eng: 2.5 }
  const modelMap: Record<string, string> = { atlas: "claude-opus-4", architect: "claude-opus-4", backend_eng: "claude-sonnet-4", cfo: "gpt-5-mini", cmo: "claude-sonnet-4", cto: "claude-opus-4", pm: "gpt-5-mini", mobile_eng: "claude-sonnet-4", revenue_ops: "gpt-5-mini", security: "claude-opus-4", side_hustle_studio: "gemini-3-flash", web_eng: "claude-sonnet-4" }
  const days: DailySpend[] = []
  let cumulative = 14200 // historical total before window
  const seed = (i: number, id: string) => Math.abs(Math.sin(i * 13.37 + id.length * 7.91)) // deterministic pseudo-random

  for (let i = 0; i < 30; i++) {
    const d = new Date(2026, 1, 26 - 29 + i) // Jan 28 through Feb 26
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    const byAgent: Record<string, number> = {}
    const byModel: Record<string, number> = { "claude-opus-4": 0, "claude-sonnet-4": 0, "gpt-5-mini": 0, "gemini-3-flash": 0 }
    let total = 0
    for (const id of agentIds) {
      const variance = 0.5 + seed(i, id) * 1.2
      const val = +(baseSpend[id] * variance).toFixed(2)
      byAgent[id] = val
      byModel[modelMap[id]] = +(byModel[modelMap[id]] + val).toFixed(2)
      total += val
    }
    total = +total.toFixed(2)
    cumulative = +(cumulative + total).toFixed(2)
    days.push({ date: label, total, cumulative, byAgent, byModel })
  }
  return days
}

export const dailySpendHistory: DailySpend[] = generateHistory()

// Incident types for timeline component
export type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved"

export interface IncidentUpdate {
  id: string
  incidentId: string
  status: IncidentStatus
  message: string
  createdAt: string
  createdBy: string
}

export interface Incident {
  id: string
  title: string
  description: string
  service: string
  severity: "critical" | "high" | "medium" | "low"
  status: IncidentStatus
  startedAt: string
  resolvedAt?: string
  updates: IncidentUpdate[]
}

export interface TimelineStage {
  status: IncidentStatus
  label: string
  startedAt: string
  endedAt?: string
  durationMs: number
  updateCount: number
  updates: IncidentUpdate[]
}

export interface IncidentTimeline {
  incidentId: string
  incident: Incident
  stages: TimelineStage[]
  totalDurationMs: number
  isOngoing: boolean
  currentStage: IncidentStatus | null
}

export const INCIDENT_STATUS_CONFIG: Record<
  IncidentStatus,
  { label: string; color: string; order: number }
> = {
  investigating: {
    label: "Investigating",
    color: "bg-yellow-500/20 text-yellow-600",
    order: 0,
  },
  identified: {
    label: "Identified",
    color: "bg-orange-500/20 text-orange-600",
    order: 1,
  },
  monitoring: {
    label: "Monitoring",
    color: "bg-blue-500/20 text-blue-600",
    order: 2,
  },
  resolved: {
    label: "Resolved",
    color: "bg-green-500/20 text-green-600",
    order: 3,
  },
}

export const tasks: Task[] = [
  {
    id: "t1",
    title: "Implement RAG pipeline v2",
    description:
      "Upgrade the retrieval-augmented generation pipeline with hybrid search capabilities including dense and sparse vector retrieval.",
    status: "in-progress",
    priority: "high",
    assignee: "backend_eng",
    createdAt: "2026-02-20",
    tags: ["engineering", "ai"],
    cost: 42.80,
    lastActivity: "2026-02-26T14:32:00Z",
  },
  {
    id: "t2",
    title: "Q1 competitor landscape report",
    description:
      "Comprehensive analysis of competitor AI agent platforms and their capabilities across pricing, features, and market positioning.",
    status: "in-progress",
    priority: "medium",
    assignee: "pm",
    createdAt: "2026-02-18",
    tags: ["research"],
    cost: 18.40,
    lastActivity: "2026-02-26T11:15:00Z",
  },
  {
    id: "t3",
    title: "Security audit: auth module",
    description:
      "Full security audit of the authentication and authorization module including token handling, session management, and RBAC policies.",
    status: "on-deck",
    priority: "critical",
    assignee: "security",
    createdAt: "2026-02-22",
    tags: ["security"],
    cost: 5.20,
    lastActivity: "2026-02-25T16:45:00Z",
  },
  {
    id: "t4",
    title: "Landing page redesign",
    description:
      "Redesign the marketing landing page with new brand guidelines, improved conversion flow, and A/B test variants.",
    status: "in-marketing",
    priority: "medium",
    assignee: "cmo",
    createdAt: "2026-02-15",
    tags: ["marketing", "design"],
    cost: 31.60,
    lastActivity: "2026-02-26T09:20:00Z",
  },
  {
    id: "t5",
    title: "E2E test suite: payments",
    description:
      "Build comprehensive end-to-end test coverage for payment flows including Stripe integration, refunds, and subscription management.",
    status: "in-testing",
    priority: "high",
    assignee: "web_eng",
    createdAt: "2026-02-19",
    tags: ["testing", "engineering"],
    cost: 27.90,
    lastActivity: "2026-02-26T13:08:00Z",
  },
  {
    id: "t6",
    title: "API rate limiting",
    description:
      "Implement intelligent rate limiting with per-agent quotas and burst handling using a token bucket algorithm.",
    status: "backlog",
    priority: "medium",
    assignee: "backend_eng",
    createdAt: "2026-02-24",
    tags: ["engineering", "infrastructure"],
    cost: 0.00,
    lastActivity: "2026-02-24T10:00:00Z",
  },
  {
    id: "t7",
    title: "Agent memory system",
    description:
      "Design and implement long-term memory storage for agent context with vector-based semantic recall and conversation threading.",
    status: "backlog",
    priority: "high",
    assignee: "Atlas",
    createdAt: "2026-02-23",
    tags: ["engineering", "ai"],
    cost: 1.50,
    lastActivity: "2026-02-23T17:30:00Z",
  },
  {
    id: "t8",
    title: "Data pipeline optimization",
    description:
      "Optimize ETL pipeline for reduced latency and improved throughput. Investigate Kafka vs. RabbitMQ for event streaming.",
    status: "parking-lot",
    priority: "low",
    assignee: "architect",
    createdAt: "2026-02-10",
    tags: ["data", "infrastructure"],
    cost: 8.70,
    lastActivity: "2026-02-14T11:22:00Z",
  },
  {
    id: "t9",
    title: "Blog: AI Agents in Production",
    description:
      "Write a deep-dive blog post about running AI agents in production environments, covering monitoring, cost control, and reliability.",
    status: "in-progress",
    priority: "medium",
    assignee: "cmo",
    createdAt: "2026-02-21",
    tags: ["content", "marketing"],
    cost: 14.30,
    lastActivity: "2026-02-26T10:45:00Z",
  },
  {
    id: "t10",
    title: "Anomaly detection v2",
    description:
      "Upgrade anomaly detection with ML-based pattern recognition and real-time alerting via Slack and PagerDuty integrations.",
    status: "on-deck",
    priority: "high",
    assignee: "security",
    createdAt: "2026-02-22",
    tags: ["engineering", "ai"],
    cost: 3.10,
    lastActivity: "2026-02-25T14:50:00Z",
  },
  {
    id: "t11",
    title: "Sprint planning automation",
    description:
      "Automate sprint planning with Atlas-driven task estimation, dependency mapping, and intelligent assignment based on agent capacity.",
    status: "in-progress",
    priority: "high",
    assignee: "Atlas",
    createdAt: "2026-02-17",
    tags: ["engineering", "orchestration"],
    cost: 56.20,
    lastActivity: "2026-02-26T15:01:00Z",
  },
  {
    id: "t12",
    title: "OAuth2 provider integration",
    description:
      "Add support for Google, GitHub, and Microsoft OAuth2 providers with proper PKCE flow and token refresh handling.",
    status: "done",
    priority: "high",
    assignee: "security",
    createdAt: "2026-02-05",
    tags: ["security", "engineering"],
    cost: 89.40,
    lastActivity: "2026-02-19T16:30:00Z",
  },
  {
    id: "t13",
    title: "Performance benchmarking tool",
    description:
      "Build an internal tool for benchmarking agent response times, accuracy scores, and cost-per-task metrics.",
    status: "done",
    priority: "medium",
    assignee: "cto",
    createdAt: "2026-02-08",
    tags: ["testing", "tooling"],
    cost: 64.80,
    lastActivity: "2026-02-22T09:15:00Z",
  },
  {
    id: "t14",
    title: "Customer onboarding flow",
    description:
      "Design guided onboarding experience for new enterprise customers including interactive tutorials and agent configuration wizards.",
    status: "backlog",
    priority: "medium",
    assignee: "pm",
    createdAt: "2026-02-25",
    tags: ["ux", "product"],
    cost: 0.00,
    lastActivity: "2026-02-25T08:00:00Z",
  },
  {
    id: "t15",
    title: "Vector DB migration",
    description:
      "Migrate from Pinecone to Qdrant for improved performance and cost savings. Includes data migration plan and zero-downtime cutover.",
    status: "parking-lot",
    priority: "low",
    assignee: "architect",
    createdAt: "2026-02-12",
    tags: ["data", "infrastructure"],
    cost: 12.30,
    lastActivity: "2026-02-16T13:40:00Z",
  },
  {
    id: "t16",
    title: "Revenue forecasting model",
    description:
      "Build a predictive revenue model using historical data and agent-driven market signals for Q2 planning.",
    status: "in-progress",
    priority: "high",
    assignee: "revenue_ops",
    createdAt: "2026-02-20",
    tags: ["analytics", "finance"],
    cost: 22.10,
    lastActivity: "2026-02-26T12:18:00Z",
  },
  {
    id: "t17",
    title: "Mobile app push notifications",
    description:
      "Implement push notification system for the mobile app with agent status updates and task completion alerts.",
    status: "backlog",
    priority: "medium",
    assignee: "mobile_eng",
    createdAt: "2026-02-24",
    tags: ["mobile", "engineering"],
    cost: 0.00,
    lastActivity: "2026-02-24T09:30:00Z",
  },
  {
    id: "t18",
    title: "Cost optimization analysis",
    description:
      "Analyze current LLM spend patterns and identify opportunities for cost reduction through model routing and caching.",
    status: "on-deck",
    priority: "high",
    assignee: "cfo",
    createdAt: "2026-02-23",
    tags: ["finance", "optimization"],
    cost: 6.40,
    lastActivity: "2026-02-25T15:20:00Z",
  },
]
