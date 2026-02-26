"use client"

import { useState, useCallback } from "react"
import { tasks as initialTasks, type Task, type TaskStatus } from "@/lib/mock-data"
import { KanbanBoard } from "./kanban-board"
import { TaskListView } from "./task-list-view"
import { TaskDetailModal } from "./task-detail-modal"
import { LastUpdatedBar } from "./last-updated-bar"
import { LayoutGrid, List } from "lucide-react"
import { cn } from "@/lib/utils"

export function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [view, setView] = useState<"kanban" | "list">("kanban")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

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

  const taskCounts = {
    total: tasks.length,
    active: tasks.filter(
      (t) => t.status === "in-progress" || t.status === "in-testing"
    ).length,
    done: tasks.filter((t) => t.status === "done").length,
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
    </div>
  )
}
