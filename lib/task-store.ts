// Task persistence layer - stores tasks and maintains pipeline state

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { Task, TaskStatus } from './mock-data'

const TASKS_FILE = join(process.cwd(), 'data', 'tasks.json')
const TASKS_QUEUE_MD = join(process.cwd(), '..', 'tasks', 'QUEUE.md')

// Ensure data directory exists
try {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true })
} catch {}

interface TaskStore {
  tasks: Task[]
  lastUpdated: string
  version: number
}

const DEFAULT_TASKS: Task[] = [
  {
    id: 't1',
    title: 'Implement RAG pipeline v2',
    description: 'Upgrade the retrieval-augmented generation pipeline with hybrid search capabilities including dense and sparse vector retrieval.',
    status: 'in-progress',
    priority: 'high',
    assignee: 'backend_eng',
    createdAt: '2026-02-20',
    tags: ['engineering', 'ai'],
    cost: 42.80,
    lastActivity: new Date().toISOString(),
  },
  {
    id: 't2',
    title: 'Q1 competitor landscape report',
    description: 'Comprehensive analysis of competitor AI agent platforms and their capabilities across pricing, features, and market positioning.',
    status: 'in-progress',
    priority: 'medium',
    assignee: 'pm',
    createdAt: '2026-02-18',
    tags: ['research'],
    cost: 18.40,
    lastActivity: new Date().toISOString(),
  },
  {
    id: 't3',
    title: 'Security audit: auth module',
    description: 'Full security audit of the authentication and authorization module including token handling, session management, and RBAC policies.',
    status: 'on-deck',
    priority: 'critical',
    assignee: 'security',
    createdAt: '2026-02-22',
    tags: ['security'],
    cost: 5.20,
    lastActivity: new Date().toISOString(),
  },
  {
    id: 't4',
    title: 'Landing page redesign',
    description: 'Redesign the marketing landing page with new brand guidelines, improved conversion flow, and A/B test variants.',
    status: 'in-marketing',
    priority: 'medium',
    assignee: 'cmo',
    createdAt: '2026-02-15',
    tags: ['marketing', 'design'],
    cost: 31.60,
    lastActivity: new Date().toISOString(),
  },
  {
    id: 't5',
    title: 'E2E test suite: payments',
    description: 'Build comprehensive end-to-end test coverage for payment flows including Stripe integration, refunds, and subscription management.',
    status: 'in-testing',
    priority: 'high',
    assignee: 'web_eng',
    createdAt: '2026-02-19',
    tags: ['testing', 'engineering'],
    cost: 27.90,
    lastActivity: new Date().toISOString(),
  },
  {
    id: 't6',
    title: 'API rate limiting',
    description: 'Implement intelligent rate limiting with per-agent quotas and burst handling using a token bucket algorithm.',
    status: 'backlog',
    priority: 'medium',
    assignee: 'backend_eng',
    createdAt: '2026-02-24',
    tags: ['engineering', 'infrastructure'],
    cost: 0.00,
    lastActivity: new Date().toISOString(),
  },
  {
    id: 't7',
    title: 'Agent memory system',
    description: 'Design and implement long-term memory storage for agent context with vector-based semantic recall and conversation threading.',
    status: 'backlog',
    priority: 'high',
    assignee: 'atlas',
    createdAt: '2026-02-23',
    tags: ['engineering', 'ai'],
    cost: 1.50,
    lastActivity: new Date().toISOString(),
  },
  {
    id: 't8',
    title: 'Data pipeline optimization',
    description: 'Optimize ETL pipeline for reduced latency and improved throughput. Investigate Kafka vs. RabbitMQ for event streaming.',
    status: 'parking-lot',
    priority: 'low',
    assignee: 'architect',
    createdAt: '2026-02-10',
    tags: ['data', 'infrastructure'],
    cost: 8.70,
    lastActivity: '2026-02-14T11:22:00Z',
  },
  {
    id: 't9',
    title: 'Blog: AI Agents in Production',
    description: 'Write a deep-dive blog post about running AI agents in production environments, covering monitoring, cost control, and reliability.',
    status: 'in-progress',
    priority: 'medium',
    assignee: 'cmo',
    createdAt: '2026-02-21',
    tags: ['content', 'marketing'],
    cost: 14.30,
    lastActivity: new Date().toISOString(),
  },
  {
    id: 't10',
    title: 'Anomaly detection v2',
    description: 'Upgrade anomaly detection with ML-based pattern recognition and real-time alerting via Slack and PagerDuty integrations.',
    status: 'on-deck',
    priority: 'high',
    assignee: 'security',
    createdAt: '2026-02-22',
    tags: ['engineering', 'ai'],
    cost: 3.10,
    lastActivity: new Date().toISOString(),
  },
  {
    id: 't11',
    title: 'Sprint planning automation',
    description: 'Automate sprint planning with Atlas-driven task estimation, dependency mapping, and intelligent assignment based on agent capacity.',
    status: 'in-progress',
    priority: 'high',
    assignee: 'atlas',
    createdAt: '2026-02-17',
    tags: ['engineering', 'orchestration'],
    cost: 56.20,
    lastActivity: new Date().toISOString(),
  },
  {
    id: 't12',
    title: 'OAuth2 provider integration',
    description: 'Add support for Google, GitHub, and Microsoft OAuth2 providers with proper PKCE flow and token refresh handling.',
    status: 'done',
    priority: 'high',
    assignee: 'security',
    createdAt: '2026-02-05',
    tags: ['security', 'engineering'],
    cost: 89.40,
    lastActivity: '2026-02-19T16:30:00Z',
  },
  {
    id: 't13',
    title: 'Performance benchmarking tool',
    description: 'Build an internal tool for benchmarking agent response times, accuracy scores, and cost-per-task metrics.',
    status: 'done',
    priority: 'medium',
    assignee: 'cto',
    createdAt: '2026-02-08',
    tags: ['testing', 'tooling'],
    cost: 64.80,
    lastActivity: '2026-02-22T09:15:00Z',
  },
  {
    id: 't14',
    title: 'Customer onboarding flow',
    description: 'Design guided onboarding experience for new enterprise customers including interactive tutorials and agent configuration wizards.',
    status: 'backlog',
    priority: 'medium',
    assignee: 'pm',
    createdAt: '2026-02-25',
    tags: ['ux', 'product'],
    cost: 0.00,
    lastActivity: new Date().toISOString(),
  },
  {
    id: 't15',
    title: 'Vector DB migration',
    description: 'Migrate from Pinecone to Qdrant for improved performance and cost savings. Includes data migration plan and zero-downtime cutover.',
    status: 'parking-lot',
    priority: 'low',
    assignee: 'architect',
    createdAt: '2026-02-12',
    tags: ['data', 'infrastructure'],
    cost: 12.30,
    lastActivity: '2026-02-16T13:40:00Z',
  },
  {
    id: 't16',
    title: 'Revenue forecasting model',
    description: 'Build a predictive revenue model using historical data and agent-driven market signals for Q2 planning.',
    status: 'in-progress',
    priority: 'high',
    assignee: 'revenue_ops',
    createdAt: '2026-02-20',
    tags: ['analytics', 'finance'],
    cost: 22.10,
    lastActivity: new Date().toISOString(),
  },
  {
    id: 't17',
    title: 'Mobile app push notifications',
    description: 'Implement push notification system for the mobile app with agent status updates and task completion alerts.',
    status: 'backlog',
    priority: 'medium',
    assignee: 'mobile_eng',
    createdAt: '2026-02-24',
    tags: ['mobile', 'engineering'],
    cost: 0.00,
    lastActivity: new Date().toISOString(),
  },
  {
    id: 't18',
    title: 'Cost optimization analysis',
    description: 'Analyze current LLM spend patterns and identify opportunities for cost reduction through model routing and caching.',
    status: 'on-deck',
    priority: 'high',
    assignee: 'cfo',
    createdAt: '2026-02-23',
    tags: ['finance', 'optimization'],
    cost: 6.40,
    lastActivity: new Date().toISOString(),
  },
]

function loadTasksFromFile(): Task[] {
  try {
    if (existsSync(TASKS_FILE)) {
      const data = readFileSync(TASKS_FILE, 'utf-8')
      const store: TaskStore = JSON.parse(data)
      return store.tasks
    }
  } catch (error) {
    console.error('Failed to load tasks from file:', error)
  }
  return DEFAULT_TASKS
}

function saveTasksToFile(tasks: Task[]) {
  try {
    const store: TaskStore = {
      tasks,
      lastUpdated: new Date().toISOString(),
      version: 1,
    }
    writeFileSync(TASKS_FILE, JSON.stringify(store, null, 2))
  } catch (error) {
    console.error('Failed to save tasks to file:', error)
  }
}

// Export singleton store
class TaskStoreManager {
  private tasks: Task[]
  private listeners: Set<(tasks: Task[]) => void>

  constructor() {
    this.tasks = loadTasksFromFile()
    this.listeners = new Set()
  }

  getTasks(): Task[] {
    return [...this.tasks]
  }

  getTasksByStatus(status: TaskStatus): Task[] {
    return this.tasks.filter(t => t.status === status)
  }

  getTasksByAssignee(assignee: string): Task[] {
    return this.tasks
      .filter(t => t.assignee.toLowerCase() === assignee.toLowerCase())
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
  }

  getCurrentTasksForAgent(assignee: string): Task[] {
    const activeStatuses: TaskStatus[] = ['in-progress', 'in-testing', 'in-marketing']
    return this.tasks
      .filter(t => 
        t.assignee.toLowerCase() === assignee.toLowerCase() && 
        activeStatuses.includes(t.status)
      )
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
  }

  getPastTasksForAgent(assignee: string): Task[] {
    const inactiveStatuses: TaskStatus[] = ['done', 'parking-lot']
    return this.tasks
      .filter(t => 
        t.assignee.toLowerCase() === assignee.toLowerCase() && 
        inactiveStatuses.includes(t.status)
      )
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
  }

  updateTask(taskId: string, updates: Partial<Task>): Task | null {
    const index = this.tasks.findIndex(t => t.id === taskId)
    if (index === -1) return null

    this.tasks[index] = {
      ...this.tasks[index],
      ...updates,
      lastActivity: new Date().toISOString(),
    }
    
    saveTasksToFile(this.tasks)
    this.notifyListeners()
    return this.tasks[index]
  }

  moveTask(taskId: string, newStatus: TaskStatus): Task | null {
    return this.updateTask(taskId, { status: newStatus })
  }

  addTask(task: Omit<Task, 'id' | 'createdAt' | 'lastActivity'>): Task {
    const newTask: Task = {
      ...task,
      id: `t${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      lastActivity: new Date().toISOString(),
    }
    this.tasks.push(newTask)
    saveTasksToFile(this.tasks)
    this.notifyListeners()
    return newTask
  }

  syncWithQueueMd(): Task[] {
    // Read from QUEUE.md and sync any new tasks
    try {
      if (existsSync(TASKS_QUEUE_MD)) {
        const content = readFileSync(TASKS_QUEUE_MD, 'utf-8')
        // Parse markdown for new tasks
        const lines = content.split('\n')
        for (const line of lines) {
          const match = line.match(/^[\s]*[-*]\s+\[([ xX])\]\s+(.+)$/)
          if (match) {
            const title = match[2].trim()
            // Check if task already exists
            if (!this.tasks.find(t => t.title === title)) {
              this.addTask({
                title,
                description: '',
                status: 'backlog',
                priority: 'medium',
                assignee: 'atlas',
                tags: [],
                cost: 0,
              })
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to sync with QUEUE.md:', error)
    }
    return this.tasks
  }

  subscribe(listener: (tasks: Task[]) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.tasks]))
  }

  getWorkingAgentCount(): number {
    const workingStatuses: TaskStatus[] = ['in-progress', 'in-testing', 'in-marketing']
    const workingAgents = new Set(
      this.tasks
        .filter(t => workingStatuses.includes(t.status))
        .map(t => t.assignee.toLowerCase())
    )
    return workingAgents.size
  }

  getActiveTaskCount(): number {
    const activeStatuses: TaskStatus[] = ['in-progress', 'in-testing', 'in-marketing']
    return this.tasks.filter(t => activeStatuses.includes(t.status)).length
  }
}

// Export singleton instance
export const taskStore = new TaskStoreManager()

// Also export for API routes
export function getTaskStore() {
  return taskStore
}