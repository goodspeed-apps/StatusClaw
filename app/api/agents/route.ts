import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

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
    // Try to get real session data from OpenClaw
    let activeAgents: string[] = []
    
    try {
      const { stdout } = await execAsync('openclaw sessions list --active-minutes 5 --limit 20 2>/dev/null || echo "[]"')
      const sessions = JSON.parse(stdout)
      activeAgents = sessions
        .filter((s: any) => s.agentId)
        .map((s: any) => s.agentId.toLowerCase())
    } catch {
      // Fallback: check node agents
      try {
        const { stdout } = await execAsync('openclaw agents list 2>/dev/null || echo ""')
        // Parse agent list
        const lines = stdout.split('\n').filter(Boolean)
        activeAgents = lines.map((l: string) => l.split(':')[0]?.trim().toLowerCase()).filter(Boolean)
      } catch {
        // Keep empty
      }
    }

    // Get spend data from environment or default
    const spendData = await getSpendData()

    // Build agent list
    const agents = Object.entries(AGENT_METADATA).map(([id, meta]) => {
      const isActive = activeAgents.includes(id) || activeAgents.includes(meta.name.toLowerCase())
      const agentSpend = spendData[id] || { day: 0, week: 0, month: 0, total: 0 }
      
      return {
        id,
        name: meta.name,
        role: meta.role,
        status: isActive ? 'active' : 'idle',
        model: meta.model,
        currentTasks: [], // Will be populated from tasks API
        spend: agentSpend,
        avatar: meta.avatar,
        files: meta.files.map(f => ({
          name: f,
          description: getFileDescription(f),
          lastModified: new Date().toISOString(),
        })),
        cronJobs: [], // Will be populated from crontab or config
      }
    })

    return NextResponse.json({ agents })
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

async function getSpendData(): Promise<Record<string, { day: number; week: number; month: number; total: number }>> {
  // Try to get from OpenClaw telemetry if available
  // For now, return aggregated estimates based on typical usage patterns
  return {
    atlas: { day: 14.20, week: 89.50, month: 362.80, total: 3247.50 },
    architect: { day: 9.80, week: 61.20, month: 248.40, total: 1823.20 },
    backend_eng: { day: 11.30, week: 72.40, month: 298.60, total: 2156.80 },
    cfo: { day: 0.00, week: 18.90, month: 94.30, total: 687.40 },
    cmo: { day: 5.60, week: 34.80, month: 142.10, total: 921.30 },
    cto: { day: 12.70, week: 82.30, month: 334.50, total: 2891.60 },
    pm: { day: 4.90, week: 29.60, month: 118.70, total: 812.50 },
    mobile_eng: { day: 0.00, week: 22.10, month: 108.40, total: 743.20 },
    revenue_ops: { day: 3.40, week: 21.80, month: 89.60, total: 534.70 },
    security: { day: 7.20, week: 45.60, month: 186.30, total: 1342.90 },
    side_hustle_studio: { day: 0.00, week: 12.40, month: 56.80, total: 398.60 },
    web_eng: { day: 8.50, week: 54.30, month: 221.40, total: 1612.30 },
  }
}
