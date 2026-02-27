// Client for fetching real data from OpenClaw CLI and APIs

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Types from OpenClaw
interface Session {
  sessionKey: string
  agentId?: string
  label?: string
  status?: string
  lastActivityAt?: string
  model?: string
  provider?: string
}

interface Agent {
  id: string
  name: string
  role: string
  model: string
  files: string[]
  cronJobs: CronJob[]
}

interface CronJob {
  name: string
  schedule: string
  description: string
  lastRun: string
  nextRun: string
  enabled: boolean
}

// Fetch active sessions from OpenClaw
export async function fetchOpenClawSessions(): Promise<Session[]> {
  try {
    const { stdout } = await execAsync('openclaw sessions list --active-minutes 60 --limit 50 2>/dev/null || echo "[]"')
    return JSON.parse(stdout)
  } catch (error) {
    console.error('Failed to fetch OpenClaw sessions:', error)
    return []
  }
}

// Fetch configured agents
export async function fetchConfiguredAgents(): Promise<string[]> {
  try {
    // Read AGENTS.md to get configured agents
    const fs = await import('fs/promises')
    const path = await import('path')
    const agentsPath = path.join(process.cwd(), '..', 'AGENTS.md')
    
    try {
      const content = await fs.readFile(agentsPath, 'utf-8')
      const agentMatches = content.match(/^##\s+([\w_-]+)/gm)
      if (agentMatches) {
        return agentMatches.map(m => m.replace('## ', '').trim().toLowerCase())
      }
    } catch {
      // File doesn't exist, use defaults
    }
    
    return [
      'atlas', 'architect', 'backend_eng', 'cfo', 'cmo', 'cto',
      'pm', 'mobile_eng', 'revenue_ops', 'security', 'side_hustle_studio', 'web_eng'
    ]
  } catch (error) {
    console.error('Failed to fetch configured agents:', error)
    return []
  }
}

// Fetch cron jobs from crontab
export async function fetchCronJobsForAgent(agentId: string): Promise<CronJob[]> {
  try {
    // Read crontab
    const { stdout } = await execAsync('crontab -l 2>/dev/null || echo ""')
    const lines = stdout.split('\n')
    
    const jobs: CronJob[] = []
    
    for (const line of lines) {
      // Look for cron entries mentioning this agent
      if (line.includes(agentId)) {
        const match = line.match(/^([\d\*\-\,\/]+\s+[\d\*\-\,\/]+\s+[\d\*\-\,\/]+\s+[\d\*\-\,\/]+\s+[\d\*\-\,\/]+)\s+(.+)$/)
        if (match) {
          jobs.push({
            name: `${agentId}-cron-${jobs.length + 1}`,
            schedule: match[1].trim(),
            description: `Scheduled task for ${agentId}`,
            lastRun: new Date(Date.now() - 86400000).toISOString(), // Placeholder
            nextRun: calculateNextRun(match[1].trim()),
            enabled: !line.trim().startsWith('#'),
          })
        }
      }
    }
    
    return jobs
  } catch (error) {
    console.error(`Failed to fetch cron jobs for ${agentId}:`, error)
    return []
  }
}

function calculateNextRun(schedule: string): string {
  // Simple calculation - in production use cron-parser
  const now = new Date()
  now.setHours(now.getHours() + 1)
  return now.toISOString()
}

// Get agent files from workspace
export async function fetchAgentFiles(agentId: string): Promise<{name: string, content: string, lastModified: string}[]> {
  try {
    const fs = await import('fs/promises')
    const path = await import('path')
    const workspacePath = path.join(process.cwd(), '..')
    
    const files = [
      'AGENTS.md', 'SOUL.md', 'TOOLS.md', 'IDENTITY.md', 
      'USER.md', 'HEARTBEAT.md', 'BOOTSTRAP.md', 'MEMORY.md'
    ]
    
    const result = []
    
    for (const file of files) {
      try {
        const filePath = path.join(workspacePath, file)
        const stats = await fs.stat(filePath)
        const content = await fs.readFile(filePath, 'utf-8')
        result.push({
          name: file,
          content,
          lastModified: stats.mtime.toISOString(),
        })
      } catch {
        // File doesn't exist, skip
      }
    }
    
    return result
  } catch (error) {
    console.error(`Failed to fetch agent files:`, error)
    return []
  }
}

// Save agent file
export async function saveAgentFile(filename: string, content: string): Promise<boolean> {
  try {
    const fs = await import('fs/promises')
    const path = await import('path')
    const filePath = path.join(process.cwd(), '..', filename)
    
    await fs.writeFile(filePath, content, 'utf-8')
    return true
  } catch (error) {
    console.error(`Failed to save file ${filename}:`, error)
    return false
  }
}

// Import spend tracker for real data
import { getAggregatedSpendData, fetchOpenRouterKeyUsage } from './spend-tracker'

// Fetch spend data from OpenRouter API and local tracker
export async function fetchOpenRouterSpend(apiKey?: string): Promise<{
  day: number
  week: number
  month: number
  total: number
  byModel: Record<string, { day: number; week: number; month: number; total: number }>
  byAgent: Record<string, { day: number; week: number; month: number; total: number }>
}> {
  const openRouterKey = apiKey || process.env.OPENROUTER_API_KEY
  
  // Get aggregated data from spend tracker (includes real OpenRouter + tracked Nano Banana Pro)
  const aggregated = await getAggregatedSpendData(openRouterKey)
  
  // Calculate total from tracked records
  const totalSpend = aggregated.overall.total
  
  // If we have real OpenRouter data, use it for time-based totals
  // Otherwise use tracked data
  const hasRealData = !!aggregated.openRouterRealData
  
  return {
    day: hasRealData 
      ? aggregated.openRouterRealData!.daily + aggregated.byProvider.gemini.day
      : aggregated.overall.day,
    week: hasRealData 
      ? aggregated.openRouterRealData!.weekly + aggregated.byProvider.gemini.week
      : aggregated.overall.week,
    month: hasRealData 
      ? aggregated.openRouterRealData!.monthly + aggregated.byProvider.gemini.month
      : aggregated.overall.month,
    total: totalSpend,
    byModel: aggregated.byModel,
    byAgent: aggregated.byAgent,
  }
}

// Fetch Gemini spend (if using direct API)
export async function fetchGeminiSpend(apiKey?: string): Promise<{
  day: number
  week: number
  month: number
  total: number
}> {
  const geminiKey = apiKey || process.env.GEMINI_API_KEY
  
  if (!geminiKey) {
    return { day: 0, week: 0, month: 0, total: 0 }
  }
  
  try {
    // Gemini doesn't have a simple usage API
    // This would need to be tracked locally
    return { day: 0, week: 0, month: 0, total: 0 }
  } catch (error) {
    console.error('Failed to fetch Gemini spend:', error)
    return { day: 0, week: 0, month: 0, total: 0 }
  }
}

function getFallbackSpendData() {
  return {
    day: 77.8,
    week: 486.2,
    month: 1988.4,
    total: 17658.3,
    byModel: {
      'claude-opus-4': { day: 43.90, week: 278.60, month: 1131.00, total: 9305.20 },
      'claude-sonnet-4': { day: 25.40, week: 183.60, month: 770.50, total: 5433.50 },
      'gpt-5-mini': { day: 8.30, week: 70.30, month: 302.60, total: 2034.60 },
      'gemini-3-flash': { day: 0.20, week: 12.40, month: 56.80, total: 398.60 },
    },
    byAgent: {
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
    },
  }
}