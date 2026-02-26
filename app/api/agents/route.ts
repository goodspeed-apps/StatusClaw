import { NextResponse } from 'next/server'
import { taskStore } from '@/lib/task-store'
import { 
  fetchOpenClawSessions, 
  fetchConfiguredAgents, 
  fetchCronJobsForAgent,
  fetchOpenRouterSpend
} from '@/lib/openclaw-client'

export const dynamic = 'force-dynamic'

// Map of agent IDs to their metadata
const AGENT_METADATA: Record<string, {
  name: string
  role: string
  model: string
  avatar: string
  files: string[]
}> = {
  atlas: {
    name: 'Atlas',
    role: 'Primary Orchestrator',
    model: 'claude-opus-4',
    avatar: '/avatars/atlas.jpg',
    files: ['AGENTS.md', 'SOUL.md', 'TOOLS.md', 'IDENTITY.md', 'USER.md', 'HEARTBEAT.md', 'BOOTSTRAP.md', 'MEMORY.md'],
  },
  architect: {
    name: 'architect',
    role: 'System Architecture',
    model: 'claude-opus-4',
    avatar: '/avatars/architect.jpg',
    files: ['AGENTS.md', 'SOUL.md', 'TOOLS.md', 'IDENTITY.md'],
  },
  backend_eng: {
    name: 'backend_eng',
    role: 'Backend Engineering',
    model: 'claude-sonnet-4',
    avatar: '/avatars/backend_eng.jpg',
    files: ['AGENTS.md', 'SOUL.md', 'TOOLS.md', 'IDENTITY.md'],
  },
  cfo: {
    name: 'cfo',
    role: 'Financial Operations',
    model: 'gpt-5-mini',
    avatar: '/avatars/cfo.jpg',
    files: ['AGENTS.md', 'SOUL.md', 'TOOLS.md'],
  },
  cmo: {
    name: 'cmo',
    role: 'Marketing Operations',
    model: 'claude-sonnet-4',
    avatar: '/avatars/cmo.jpg',
    files: ['AGENTS.md', 'SOUL.md', 'TOOLS.md'],
  },
  cto: {
    name: 'cto',
    role: 'Technical Leadership',
    model: 'claude-opus-4',
    avatar: '/avatars/cto.jpg',
    files: ['AGENTS.md', 'SOUL.md', 'TOOLS.md', 'IDENTITY.md'],
  },
  pm: {
    name: 'pm',
    role: 'Product Management',
    model: 'gpt-5-mini',
    avatar: '/avatars/pm.jpg',
    files: ['AGENTS.md', 'SOUL.md', 'TOOLS.md', 'USER.md'],
  },
  mobile_eng: {
    name: 'mobile_eng',
    role: 'Mobile Engineering',
    model: 'claude-sonnet-4',
    avatar: '/avatars/mobile_eng.jpg',
    files: ['AGENTS.md', 'SOUL.md', 'TOOLS.md'],
  },
  revenue_ops: {
    name: 'revenue_ops',
    role: 'Revenue Operations',
    model: 'gpt-5-mini',
    avatar: '/avatars/revenue_ops.jpg',
    files: ['AGENTS.md', 'SOUL.md', 'TOOLS.md'],
  },
  security: {
    name: 'security',
    role: 'Security & Compliance',
    model: 'claude-opus-4',
    avatar: '/avatars/security.jpg',
    files: ['AGENTS.md', 'SOUL.md', 'TOOLS.md', 'IDENTITY.md'],
  },
  side_hustle_studio: {
    name: 'side_hustle_studio',
    role: 'Creative Ventures',
    model: 'gemini-3-flash',
    avatar: '/avatars/side_hustle_studio.jpg',
    files: ['AGENTS.md', 'SOUL.md', 'TOOLS.md'],
  },
  web_eng: {
    name: 'web_eng',
    role: 'Web Engineering',
    model: 'claude-sonnet-4',
    avatar: '/avatars/web_eng.jpg',
    files: ['AGENTS.md', 'SOUL.md', 'TOOLS.md', 'IDENTITY.md'],
  },
}

export async function GET() {
  try {
    // Fetch real-time data
    const [sessions, configuredAgents, spendData] = await Promise.all([
      fetchOpenClawSessions(),
      fetchConfiguredAgents(),
      fetchOpenRouterSpend()
    ])

    // Get active session agent IDs
    const activeSessionIds = new Set(
      sessions
        .filter(s => s.agentId)
        .map(s => s.agentId!.toLowerCase())
    )

    // Get current tasks from task store
    const allTasks = taskStore.getTasks()
    const workingStatuses = ['in-progress', 'in-testing', 'in-marketing']

    // Build agent list
    const agents = await Promise.all(
      Object.entries(AGENT_METADATA).map(async ([id, meta]) => {
        // Check if agent has active session
        const hasActiveSession = activeSessionIds.has(id) || 
          activeSessionIds.has(meta.name.toLowerCase())
        
        // Get agent's current tasks
        const agentTasks = allTasks.filter(t => 
          t.assignee.toLowerCase() === id.toLowerCase() ||
          t.assignee.toLowerCase() === meta.name.toLowerCase()
        )
        
        // Check if agent is working (has active tasks)
        const currentTasks = agentTasks
          .filter(t => workingStatuses.includes(t.status))
          .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
        
        const isWorking = currentTasks.length > 0
        
        // Get past tasks
        const pastTasks = agentTasks
          .filter(t => !workingStatuses.includes(t.status))
          .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
        
        // Fetch cron jobs
        const cronJobs = await fetchCronJobsForAgent(id)
        
        // Get spend data for this agent
        const agentSpend = spendData.byAgent?.[id] || { day: 0, week: 0, month: 0, total: 0 }

        return {
          id,
          name: meta.name,
          role: meta.role,
          status: isWorking ? 'active' : hasActiveSession ? 'idle' : 'offline',
          model: meta.model,
          currentTasks: currentTasks.map(t => t.title),
          pastTasks: pastTasks.map(t => ({ id: t.id, title: t.title, status: t.status })),
          spend: agentSpend,
          avatar: meta.avatar,
          files: meta.files.map(f => ({
            name: f,
            description: getFileDescription(f),
            lastModified: new Date().toISOString(),
          })),
          cronJobs,
        }
      })
    )

    // Calculate working agent count
    const workingCount = agents.filter(a => a.status === 'active').length

    return NextResponse.json({ 
      agents,
      workingCount,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
  }
}

function getFileDescription(filename: string): string {
  const descriptions: Record<string, string> = {
    'AGENTS.md': 'Team agents and capabilities registry',
    'SOUL.md': 'Core personality and behavioral guidelines',
    'TOOLS.md': 'Available tools and MCP integrations',
    'IDENTITY.md': 'Agent identity and authentication',
    'USER.md': 'User preferences and context',
    'HEARTBEAT.md': 'Health monitoring configuration',
    'BOOTSTRAP.md': 'Initialization and startup routines',
    'MEMORY.md': 'Long-term memory and recall systems',
  }
  return descriptions[filename] || 'Agent configuration file'
}
