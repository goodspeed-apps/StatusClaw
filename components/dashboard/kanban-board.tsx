"use client"

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import type { Task, TaskStatus } from "@/lib/mock-data"
import { TASK_STATUS_CONFIG, TASK_COLUMNS } from "@/lib/mock-data"
import { TaskCard } from "./task-card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { ChevronRight, ChevronLeft, GripVertical } from "lucide-react"

export function KanbanBoard({
  tasks,
  onTaskMove,
  onTaskClick,
}: {
  tasks: Task[]
  onTaskMove: (taskId: string, newStatus: TaskStatus) => void
  onTaskClick: (task: Task) => void
}) {
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [collapsedColumns, setCollapsedColumns] = useState<Set<TaskStatus>>(new Set())
  const [columnOrder, setColumnOrder] = useState<TaskStatus[]>(TASK_COLUMNS)
  const [draggedColumn, setDraggedColumn] = useState<TaskStatus | null>(null)
  const [dragOverColumnHeader, setDragOverColumnHeader] = useState<TaskStatus | null>(null)

  // Task drag handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, task: Task) => {
      e.dataTransfer.setData("text/plain", task.id)
      e.dataTransfer.setData("dragType", "task")
      setDraggedTaskId(task.id)
    },
    []
  )

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null)
    setDragOverColumn(null)
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent, status: TaskStatus) => {
      e.preventDefault()
      const dragType = e.dataTransfer.types.includes("dragtype") ? "column" : "task"
      if (draggedTaskId) {
        setDragOverColumn(status)
      }
    },
    [draggedTaskId]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent, status: TaskStatus) => {
      e.preventDefault()
      const dragType = e.dataTransfer.getData("dragType")
      if (dragType === "task") {
        const taskId = e.dataTransfer.getData("text/plain")
        if (taskId) {
          onTaskMove(taskId, status)
        }
      }
      setDragOverColumn(null)
      setDraggedTaskId(null)
    },
    [onTaskMove]
  )

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null)
  }, [])

  // Column drag handlers
  const handleColumnDragStart = useCallback(
    (e: React.DragEvent, status: TaskStatus) => {
      e.dataTransfer.setData("columnId", status)
      e.dataTransfer.setData("dragType", "column")
      e.dataTransfer.effectAllowed = "move"
      setDraggedColumn(status)
    },
    []
  )

  const handleColumnDragEnd = useCallback(() => {
    setDraggedColumn(null)
    setDragOverColumnHeader(null)
  }, [])

  const handleColumnDragOver = useCallback(
    (e: React.DragEvent, status: TaskStatus) => {
      e.preventDefault()
      if (draggedColumn && draggedColumn !== status) {
        setDragOverColumnHeader(status)
      }
    },
    [draggedColumn]
  )

  const handleColumnDrop = useCallback(
    (e: React.DragEvent, targetStatus: TaskStatus) => {
      e.preventDefault()
      const sourceStatus = e.dataTransfer.getData("columnId") as TaskStatus
      if (sourceStatus && sourceStatus !== targetStatus) {
        setColumnOrder((prev) => {
          const newOrder = [...prev]
          const sourceIndex = newOrder.indexOf(sourceStatus)
          const targetIndex = newOrder.indexOf(targetStatus)
          newOrder.splice(sourceIndex, 1)
          newOrder.splice(targetIndex, 0, sourceStatus)
          return newOrder
        })
      }
      setDraggedColumn(null)
      setDragOverColumnHeader(null)
    },
    []
  )

  const toggleColumnCollapse = useCallback((status: TaskStatus) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev)
      if (next.has(status)) {
        next.delete(status)
      } else {
        next.add(status)
      }
      return next
    })
  }, [])

  const getColumnColor = (status: TaskStatus) => {
    switch (status) {
      case "in-progress": return "bg-accent"
      case "done": return "bg-chart-2"
      case "on-deck": return "bg-chart-1"
      case "in-testing": return "bg-chart-3"
      case "in-marketing": return "bg-chart-4"
      case "backlog": return "bg-muted-foreground"
      case "parking-lot": return "bg-chart-5"
      default: return "bg-muted-foreground"
    }
  }

  const getColumnGlow = (status: TaskStatus) => {
    switch (status) {
      case "in-progress": return "shadow-[0_0_6px_var(--glow-accent)]"
      case "done": return "shadow-[0_0_6px_var(--glow-success)]"
      case "on-deck": return "shadow-[0_0_6px_var(--glow-primary)]"
      case "in-testing": return "shadow-[0_0_6px_var(--glow-warning)]"
      default: return ""
    }
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-3 pb-4" style={{ minWidth: "max-content" }}>
        {columnOrder.map((status) => {
          const config = TASK_STATUS_CONFIG[status]
          const columnTasks = tasks.filter((t) => t.status === status)
          const isOver = dragOverColumn === status
          const isCollapsed = collapsedColumns.has(status)
          const isColumnDragging = draggedColumn === status
          const isColumnDragOver = dragOverColumnHeader === status

          if (isCollapsed) {
            return (
              <div
                key={status}
                draggable
                onDragStart={(e) => handleColumnDragStart(e, status)}
                onDragEnd={handleColumnDragEnd}
                onDragOver={(e) => handleColumnDragOver(e, status)}
                onDrop={(e) => handleColumnDrop(e, status)}
                className={cn(
                  "flex w-12 shrink-0 flex-col rounded-xl border border-border bg-secondary/20 transition-all duration-200 cursor-grab active:cursor-grabbing",
                  isColumnDragging && "opacity-50",
                  isColumnDragOver && "border-primary/50 bg-primary/10"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleColumnCollapse(status)}
                  className="flex h-full min-h-[200px] flex-col items-center gap-2 py-3 cursor-pointer hover:bg-secondary/40 transition-colors"
                >
                  <div
                    className={cn(
                      "h-2.5 w-2.5 rounded-full shrink-0",
                      getColumnColor(status),
                      getColumnGlow(status)
                    )}
                  />
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider text-foreground"
                    style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
                  >
                    {config.label}
                  </span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-secondary text-[10px] font-bold text-muted-foreground font-mono mt-auto">
                    {columnTasks.length}
                  </span>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </button>
              </div>
            )
          }

          return (
            <div
              key={status}
              className={cn(
                "flex w-72 shrink-0 flex-col rounded-xl border border-border bg-secondary/20 transition-all duration-200",
                isOver && "border-primary/50 bg-primary/5 shadow-[0_0_20px_var(--glow-primary)]",
                isColumnDragging && "opacity-50",
                isColumnDragOver && "border-primary/50 bg-primary/10"
              )}
              onDragOver={(e) => {
                handleDragOver(e, status)
                if (draggedColumn) handleColumnDragOver(e, status)
              }}
              onDrop={(e) => {
                if (draggedColumn) {
                  handleColumnDrop(e, status)
                } else {
                  handleDrop(e, status)
                }
              }}
              onDragLeave={handleDragLeave}
            >
              {/* Column Header */}
              <div
                draggable
                onDragStart={(e) => handleColumnDragStart(e, status)}
                onDragEnd={handleColumnDragEnd}
                className="flex items-center justify-between border-b border-border px-4 py-3 cursor-grab active:cursor-grabbing group"
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="size-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  <div
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      getColumnColor(status),
                      getColumnGlow(status)
                    )}
                  />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {config.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-secondary text-[10px] font-bold text-muted-foreground font-mono">
                    {columnTasks.length}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleColumnCollapse(status)
                    }}
                    className="p-0.5 hover:bg-secondary rounded transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="size-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Tasks */}
              <div className="flex flex-col gap-2 p-2" style={{ minHeight: 120 }}>
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "transition-opacity duration-200",
                      draggedTaskId === task.id && "opacity-40"
                    )}
                  >
                    <TaskCard
                      task={task}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onClick={onTaskClick}
                    />
                  </div>
                ))}
                {columnTasks.length === 0 && (
                  <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-8">
                    <p className="text-xs text-muted-foreground/50">
                      Drop tasks here
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
