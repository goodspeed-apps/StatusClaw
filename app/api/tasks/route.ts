import { NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Try to read from tasks/QUEUE.md in the workspace
    const tasks = await fetchTasksFromQueue()
    
    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

async function fetchTasksFromQueue(): Promise<any[]> {
  const queuePath = join(process.cwd(), '..', 'tasks', 'QUEUE.md')
  
  if (!existsSync(queuePath)) {
    // Fallback to mock tasks if no queue file
    return getFallbackTasks()
  }
  
  try {
    const content = readFileSync(queuePath, 'utf-8')
    return parseQueueMarkdown(content)
  } catch {
    return getFallbackTasks()
  }
}

function parseQueueMarkdown(content: string): any[] {
  const tasks: any[] = []
  const sections = content.split(/\n##\s+/)
  
  let currentStatus = 'backlog'
  
  for (const section of sections) {
    const lines = section.split('\n')
    const header = lines[0]?.trim().toLowerCase() || ''
    
    // Determine status from header
    if (header.includes('active') || header.includes('in progress')) currentStatus = 'in-progress'
    else if (header.includes('on deck') || header.includes('ready')) currentStatus = 'on-deck'
    else if (header.includes('backlog')) currentStatus = 'backlog'
    else if (header.includes('done') || header.includes('completed')) currentStatus = 'done'
    else if (header.includes('parking')) currentStatus = 'parking-lot'
    
    // Parse tasks in this section
    const taskLines = lines.filter(l => l.trim().startsWith('- ') || l.trim().startsWith('* '))
    
    for (const line of taskLines) {
      const match = line.match(/^[-*]\s*\[([ xX])\]\s*(.+)$/)
      if (match) {
        const isDone = match[1].toLowerCase() === 'x'
        const title = match[2].trim()
        
        tasks.push({
          id: `task-${tasks.length + 1}`,
          title,
          description: '',
          status: isDone ? 'done' : currentStatus,
          priority: inferPriority(title),
          assignee: inferAssignee(title),
          createdAt: new Date().toISOString().split('T')[0],
          tags: inferTags(title),
          cost: 0,
          lastActivity: new Date().toISOString(),
        })
      }
    }
  }
  
  return tasks.length > 0 ? tasks : getFallbackTasks()
}

function inferPriority(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('critical') || t.includes('urgent') || t.includes('p0')) return 'critical'
  if (t.includes('high') || t.includes('important') || t.includes('p1')) return 'high'
  if (t.includes('low') || t.includes('nice to have')) return 'low'
  return 'medium'
}

function inferAssignee(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('marketing') || t.includes('content')) return 'cmo'
  if (t.includes('backend') || t.includes('api') || t.includes('db')) return 'backend_eng'
  if (t.includes('frontend') || t.includes('ui') || t.includes('web')) return 'web_eng'
  if (t.includes('security')) return 'security'
  if (t.includes('mobile')) return 'mobile_eng'
  if (t.includes('finance') || t.includes('revenue') || t.includes('cost')) return 'cfo'
  if (t.includes('product') || t.includes('roadmap')) return 'pm'
  return 'atlas'
}

function inferTags(title: string): string[] {
  const tags: string[] = []
  const t = title.toLowerCase()
  if (t.includes('marketing')) tags.push('marketing')
  if (t.includes('api') || t.includes('backend')) tags.push('engineering')
  if (t.includes('frontend') || t.includes('ui')) tags.push('frontend')
  if (t.includes('security')) tags.push('security')
  if (t.includes('ai') || t.includes('ml')) tags.push('ai')
  return tags
}

function getFallbackTasks(): any[] {
  return [
    {
      id: 't1',
      title: 'Implement RAG pipeline v2',
      description: 'Upgrade the retrieval-augmented generation pipeline with hybrid search capabilities.',
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
      description: 'Comprehensive analysis of competitor AI agent platforms.',
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
      description: 'Full security audit of authentication and authorization module.',
      status: 'on-deck',
      priority: 'critical',
      assignee: 'security',
      createdAt: '2026-02-22',
      tags: ['security'],
      cost: 5.20,
      lastActivity: new Date().toISOString(),
    },
  ]
}
