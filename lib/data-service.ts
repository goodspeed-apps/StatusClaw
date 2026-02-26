// Data service to fetch real-time dashboard data from API routes

import type { Agent, LLMModel, Task, DailySpend } from '@/lib/mock-data'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

interface DashboardData {
  agents: Agent[]
  models: LLMModel[]
  tasks: Task[]
  spend: {
    current: { day: number; week: number; month: number; total: number }
    history: DailySpend[]
  }
  lastUpdated: string
}

export async function fetchDashboardData(): Promise<DashboardData> {
  try {
    const [agentsRes, modelsRes, tasksRes, spendRes] = await Promise.all([
      fetch(`${API_BASE}/api/agents`, { cache: 'no-store' }),
      fetch(`${API_BASE}/api/models`, { cache: 'no-store' }),
      fetch(`${API_BASE}/api/tasks`, { cache: 'no-store' }),
      fetch(`${API_BASE}/api/spend`, { cache: 'no-store' }),
    ])

    const [agentsData, modelsData, tasksData, spendData] = await Promise.all([
      agentsRes.json(),
      modelsRes.json(),
      tasksRes.json(),
      spendRes.json(),
    ])

    // Enrich agents with their tasks
    const agents = agentsData.agents || []
    const tasks = tasksData.tasks || []
    
    // Assign tasks to agents
    agents.forEach((agent: Agent) => {
      agent.currentTasks = tasks
        .filter((t: Task) => 
          t.assignee.toLowerCase() === agent.name.toLowerCase() ||
          t.assignee.toLowerCase() === agent.id.toLowerCase()
        )
        .map((t: Task) => t.title)
    })

    return {
      agents,
      models: modelsData.models || [],
      tasks,
      spend: {
        current: spendData.current || { day: 0, week: 0, month: 0, total: 0 },
        history: spendData.history || [],
      },
      lastUpdated: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
    // Return fallback data
    return {
      agents: [],
      models: [],
      tasks: [],
      spend: {
        current: { day: 0, week: 0, month: 0, total: 0 },
        history: [],
      },
      lastUpdated: new Date().toISOString(),
    }
  }
}

export async function fetchAgents(): Promise<Agent[]> {
  try {
    const res = await fetch(`${API_BASE}/api/agents`, { cache: 'no-store' })
    const data = await res.json()
    return data.agents || []
  } catch (error) {
    console.error('Failed to fetch agents:', error)
    return []
  }
}

export async function fetchModels(): Promise<LLMModel[]> {
  try {
    const res = await fetch(`${API_BASE}/api/models`, { cache: 'no-store' })
    const data = await res.json()
    return data.models || []
  } catch (error) {
    console.error('Failed to fetch models:', error)
    return []
  }
}

export async function fetchTasks(): Promise<Task[]> {
  try {
    const res = await fetch(`${API_BASE}/api/tasks`, { cache: 'no-store' })
    const data = await res.json()
    return data.tasks || []
  } catch (error) {
    console.error('Failed to fetch tasks:', error)
    return []
  }
}

export async function fetchSpend() {
  try {
    const res = await fetch(`${API_BASE}/api/spend`, { cache: 'no-store' })
    const data = await res.json()
    return {
      current: data.current || { day: 0, week: 0, month: 0, total: 0 },
      history: data.history || [],
    }
  } catch (error) {
    console.error('Failed to fetch spend:', error)
    return {
      current: { day: 0, week: 0, month: 0, total: 0 },
      history: [],
    }
  }
}
