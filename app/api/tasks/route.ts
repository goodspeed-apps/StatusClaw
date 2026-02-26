import { NextResponse } from 'next/server'
import { taskStore, getTaskStore } from '@/lib/task-store'
import type { TaskStatus } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

// GET - Fetch all tasks
export async function GET() {
  try {
    // Sync with QUEUE.md first
    taskStore.syncWithQueueMd()
    
    const tasks = taskStore.getTasks()
    const workingCount = taskStore.getWorkingAgentCount()
    const activeCount = taskStore.getActiveTaskCount()
    
    return NextResponse.json({ 
      tasks,
      workingCount,
      activeCount,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

// PATCH - Update task (for drag-drop moves)
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { taskId, updates } = body
    
    if (!taskId || !updates) {
      return NextResponse.json({ error: 'Missing taskId or updates' }, { status: 400 })
    }
    
    const updatedTask = taskStore.updateTask(taskId, updates)
    
    if (!updatedTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    
    return NextResponse.json({ task: updatedTask })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

// POST - Move task to new status (convenience endpoint)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { taskId, newStatus } = body as { taskId: string; newStatus: TaskStatus }
    
    if (!taskId || !newStatus) {
      return NextResponse.json({ error: 'Missing taskId or newStatus' }, { status: 400 })
    }
    
    const updatedTask = taskStore.moveTask(taskId, newStatus)
    
    if (!updatedTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    
    return NextResponse.json({ task: updatedTask })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to move task' }, { status: 500 })
  }
}
