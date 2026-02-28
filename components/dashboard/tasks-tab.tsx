"use client"

import { useState, useCallback, useEffect } from "react"
import { type Task, type TaskStatus } from "@/lib/mock-data"
import { fetchTasks } from "@/lib/data-service"
import { KanbanBoard } from "./kanban-board"
import { TaskListView } from "./task-list-view"
import { TaskDetailModal } from "./task-detail-modal"
import { CreateTaskModal } from "./create-task-modal"
import { LastUpdatedBar } from "./last-updated-bar"
import { useTaskShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { Button } from "@/components/ui/button"
import { LayoutGrid, List, Loader2, Plus, Command } from "lucide-react"
import { cn } from "@/lib/utils"

export function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"kanban" | "list">("kanban")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const data = await fetchTasks()
      setTasks(data)
      setLoading(false)
    }
    loadData()
  }, [])

  const handleTaskMove = useCallback(
    (taskId: string, newStatus: TaskStatus) => {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      )
    },
    []
  )

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task)
    setModalOpen(true)
  }, [])

  const handleTaskSave = useCallback((updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    )
    setSelectedTask(updatedTask)
    setModalOpen(false)
  }, [])

  const handleCreateTask = useCallback((newTask: Task) => {
    setTasks((prev) => [newTask, ...prev])
    setCreateModalOpen(false)
  }, [])

  // Setup keyboard shortcut for new task (cmd+n)
  useTaskShortcuts({
    onNewTask: () => {
      if (!createModalOpen && !modalOpen) {
        setCreateModalOpen(true)
      }
    },
    modalOpen: createModalOpen || modalOpen,
  })

  const taskCounts = {
    total: tasks.length,
    active: tasks.filter(
      (t) => t.status === "in-progress" || t.status === "in-testing"
    ).length,
    done: tasks.filter((t) => t.status === "done").length,
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <LastUpdatedBar />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <LastUpdatedBar />

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-primary shadow-[0_0_8px_var(--glow-primary)]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Task Board
            </h2>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <span className="rounded-md bg-secondary/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground font-mono">
              {taskCounts.total} total
            </span>
            <span className="rounded-md bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent font-mono">
              {taskCounts.active} active
            </span>
            <span className="rounded-md bg-chart-2/10 px-2 py-0.5 text-[10px] font-semibold text-chart-2 font-mono">
              {taskCounts.done} done
            </span>
          </div>
        </div>

        {/* New Task Button with Keyboard Shortcut */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCreateModalOpen(true)}
            size="sm"
            className="gap-1.5 shadow-[0_0_10px_var(--glow-primary)]"
          >
            <Plus className="size-3.5" />
            New Task
          </Button>
          <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground/60">
            <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[9px] flex items-center gap-0.5">
              <Command className="size-2.5" />N
            </kbd>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center rounded-lg border border-border bg-secondary/30 p-0.5">
          <button
            onClick={() => setView("kanban")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              view === "kanban"
                ? "bg-primary text-primary-foreground shadow-[0_0_10px_var(--glow-primary)]"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Kanban view"
          >
            <LayoutGrid className="size-3.5" />
            <span className="hidden sm:inline">Board</span>
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              view === "list"
                ? "bg-primary text-primary-foreground shadow-[0_0_10px_var(--glow-primary)]"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="List view"
          >
            <List className="size-3.5" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {view === "kanban" ? (
        <KanbanBoard
          tasks={tasks}
          onTaskMove={handleTaskMove}
          onTaskClick={handleTaskClick}
        />
      ) : (
        <TaskListView tasks={tasks} onTaskClick={handleTaskClick} />
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handleTaskSave}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCreate={handleCreateTask}
      />
    </div>
  )
}