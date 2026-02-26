"use client"

import { useState, useMemo, useCallback } from "react"
import type { Task, TaskStatus, TaskPriority } from "@/lib/mock-data"
import { TASK_STATUS_CONFIG } from "@/lib/mock-data"
import { TaskListRow } from "./task-card"
import { cn } from "@/lib/utils"
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Filter, X, GripVertical } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

type SortField = "title" | "status" | "priority" | "assignee" | "cost" | "createdAt" | "lastActivity"
type SortDirection = "asc" | "desc"

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

const STATUS_ORDER: Record<TaskStatus, number> = {
  "in-progress": 6,
  "in-testing": 5,
  "on-deck": 4,
  "in-marketing": 3,
  "done": 2,
  "backlog": 1,
  "parking-lot": 0,
}

export function TaskListView({
  tasks: initialTasks,
  onTaskClick,
  onTasksReorder,
}: {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onTasksReorder?: (tasks: Task[]) => void
}) {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilters, setStatusFilters] = useState<Set<TaskStatus>>(new Set())
  const [priorityFilters, setPriorityFilters] = useState<Set<TaskPriority>>(new Set())
  const [assigneeFilters, setAssigneeFilters] = useState<Set<string>>(new Set())
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null)
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null)
  const [manualOrder, setManualOrder] = useState<string[]>(() => initialTasks.map(t => t.id))

  // Get unique assignees
  const uniqueAssignees = useMemo(() => {
    return [...new Set(initialTasks.map(t => t.assignee))].sort()
  }, [initialTasks])

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...initialTasks]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.assignee.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Apply status filter
    if (statusFilters.size > 0) {
      result = result.filter((t) => statusFilters.has(t.status))
    }

    // Apply priority filter
    if (priorityFilters.size > 0) {
      result = result.filter((t) => priorityFilters.has(t.priority))
    }

    // Apply assignee filter
    if (assigneeFilters.size > 0) {
      result = result.filter((t) => assigneeFilters.has(t.assignee))
    }

    // Apply sorting
    if (sortField) {
      result.sort((a, b) => {
        let comparison = 0
        switch (sortField) {
          case "title":
            comparison = a.title.localeCompare(b.title)
            break
          case "status":
            comparison = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
            break
          case "priority":
            comparison = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
            break
          case "assignee":
            comparison = a.assignee.localeCompare(b.assignee)
            break
          case "cost":
            comparison = a.cost - b.cost
            break
          case "createdAt":
            comparison = a.createdAt.localeCompare(b.createdAt)
            break
          case "lastActivity":
            comparison = a.lastActivity.localeCompare(b.lastActivity)
            break
        }
        return sortDirection === "asc" ? comparison : -comparison
      })
    } else {
      // When no sort is applied, use manual order
      result.sort((a, b) => {
        const aIndex = manualOrder.indexOf(a.id)
        const bIndex = manualOrder.indexOf(b.id)
        return aIndex - bIndex
      })
    }

    return result
  }, [initialTasks, searchQuery, statusFilters, priorityFilters, assigneeFilters, sortField, sortDirection, manualOrder])

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else {
        setSortField(null)
        setSortDirection("asc")
      }
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }, [sortField, sortDirection])

  const toggleStatusFilter = useCallback((status: TaskStatus) => {
    setStatusFilters((prev) => {
      const next = new Set(prev)
      if (next.has(status)) {
        next.delete(status)
      } else {
        next.add(status)
      }
      return next
    })
  }, [])

  const togglePriorityFilter = useCallback((priority: TaskPriority) => {
    setPriorityFilters((prev) => {
      const next = new Set(prev)
      if (next.has(priority)) {
        next.delete(priority)
      } else {
        next.add(priority)
      }
      return next
    })
  }, [])

  const toggleAssigneeFilter = useCallback((assignee: string) => {
    setAssigneeFilters((prev) => {
      const next = new Set(prev)
      if (next.has(assignee)) {
        next.delete(assignee)
      } else {
        next.add(assignee)
      }
      return next
    })
  }, [])

  const clearAllFilters = useCallback(() => {
    setSearchQuery("")
    setStatusFilters(new Set())
    setPriorityFilters(new Set())
    setAssigneeFilters(new Set())
  }, [])

  const hasActiveFilters = searchQuery.trim() || statusFilters.size > 0 || priorityFilters.size > 0 || assigneeFilters.size > 0

  // Row drag handlers
  const handleRowDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId)
    e.dataTransfer.effectAllowed = "move"
    setDraggedRowId(taskId)
  }, [])

  const handleRowDragEnd = useCallback(() => {
    setDraggedRowId(null)
    setDragOverRowId(null)
  }, [])

  const handleRowDragOver = useCallback((e: React.DragEvent, taskId: string) => {
    e.preventDefault()
    if (draggedRowId && draggedRowId !== taskId) {
      setDragOverRowId(taskId)
    }
  }, [draggedRowId])

  const handleRowDrop = useCallback((e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault()
    const sourceTaskId = e.dataTransfer.getData("taskId")
    if (sourceTaskId && sourceTaskId !== targetTaskId) {
      setManualOrder((prev) => {
        const newOrder = [...prev]
        const sourceIndex = newOrder.indexOf(sourceTaskId)
        const targetIndex = newOrder.indexOf(targetTaskId)
        if (sourceIndex !== -1 && targetIndex !== -1) {
          newOrder.splice(sourceIndex, 1)
          newOrder.splice(targetIndex, 0, sourceTaskId)
        }
        return newOrder
      })
      // Clear sort when manually reordering
      setSortField(null)
    }
    setDraggedRowId(null)
    setDragOverRowId(null)
  }, [])

  const SortableHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => {
    const isActive = sortField === field
    return (
      <th
        className={cn(
          "px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground hover:bg-secondary/50 transition-colors select-none",
          isActive && "text-primary",
          className
        )}
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          {children}
          {isActive ? (
            sortDirection === "asc" ? (
              <ArrowUp className="size-3" />
            ) : (
              <ArrowDown className="size-3" />
            )
          ) : (
            <ArrowUpDown className="size-3 opacity-40" />
          )}
        </div>
      </th>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search and Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-9 text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-secondary rounded cursor-pointer"
            >
              <X className="size-3 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 cursor-pointer">
              <Filter className="size-3.5" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground">
                  {statusFilters.size + priorityFilters.size + assigneeFilters.size}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Status
            </DropdownMenuLabel>
            {(Object.keys(TASK_STATUS_CONFIG) as TaskStatus[]).map((status) => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={statusFilters.has(status)}
                onCheckedChange={() => toggleStatusFilter(status)}
                className="text-xs cursor-pointer"
              >
                {TASK_STATUS_CONFIG[status].label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Priority
            </DropdownMenuLabel>
            {(["critical", "high", "medium", "low"] as TaskPriority[]).map((priority) => (
              <DropdownMenuCheckboxItem
                key={priority}
                checked={priorityFilters.has(priority)}
                onCheckedChange={() => togglePriorityFilter(priority)}
                className="text-xs capitalize cursor-pointer"
              >
                {priority}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Assignee
            </DropdownMenuLabel>
            {uniqueAssignees.map((assignee) => (
              <DropdownMenuCheckboxItem
                key={assignee}
                checked={assigneeFilters.has(assignee)}
                onCheckedChange={() => toggleAssigneeFilter(assignee)}
                className="text-xs cursor-pointer"
              >
                {assignee}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="size-3" />
            Clear
          </Button>
        )}

        {/* Active Filter Tags */}
        <div className="flex flex-wrap gap-1.5">
          {[...statusFilters].map((status) => (
            <Badge
              key={status}
              variant="secondary"
              className="text-[10px] gap-1 pr-1 cursor-pointer"
              onClick={() => toggleStatusFilter(status)}
            >
              {TASK_STATUS_CONFIG[status].label}
              <X className="size-2.5" />
            </Badge>
          ))}
          {[...priorityFilters].map((priority) => (
            <Badge
              key={priority}
              variant="secondary"
              className="text-[10px] gap-1 pr-1 capitalize cursor-pointer"
              onClick={() => togglePriorityFilter(priority)}
            >
              {priority}
              <X className="size-2.5" />
            </Badge>
          ))}
          {[...assigneeFilters].map((assignee) => (
            <Badge
              key={assignee}
              variant="secondary"
              className="text-[10px] gap-1 pr-1 cursor-pointer"
              onClick={() => toggleAssigneeFilter(assignee)}
            >
              {assignee}
              <X className="size-2.5" />
            </Badge>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="text-[10px] text-muted-foreground">
        Showing {filteredAndSortedTasks.length} of {initialTasks.length} tasks
        {!sortField && <span className="ml-2 text-muted-foreground/60">(drag rows to reorder)</span>}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="w-8 px-2 py-3" />
                <SortableHeader field="title">Task</SortableHeader>
                <SortableHeader field="status">Status</SortableHeader>
                <SortableHeader field="priority">Priority</SortableHeader>
                <SortableHeader field="assignee">Assignee</SortableHeader>
                <SortableHeader field="cost">Cost</SortableHeader>
                <SortableHeader field="createdAt" className="whitespace-nowrap">Created</SortableHeader>
                <SortableHeader field="lastActivity" className="whitespace-nowrap">Last Activity</SortableHeader>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedTasks.map((task) => (
                <DraggableTaskRow
                  key={task.id}
                  task={task}
                  onClick={onTaskClick}
                  isDragging={draggedRowId === task.id}
                  isDragOver={dragOverRowId === task.id}
                  onDragStart={handleRowDragStart}
                  onDragEnd={handleRowDragEnd}
                  onDragOver={handleRowDragOver}
                  onDrop={handleRowDrop}
                  sortActive={sortField !== null}
                />
              ))}
              {filteredAndSortedTasks.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <p className="text-sm text-muted-foreground">No tasks match your filters</p>
                    {hasActiveFilters && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={clearAllFilters}
                        className="mt-2 text-xs cursor-pointer"
                      >
                        Clear all filters
                      </Button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function DraggableTaskRow({
  task,
  onClick,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  sortActive,
}: {
  task: Task
  onClick?: (task: Task) => void
  isDragging: boolean
  isDragOver: boolean
  onDragStart: (e: React.DragEvent, taskId: string) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, taskId: string) => void
  onDrop: (e: React.DragEvent, taskId: string) => void
  sortActive: boolean
}) {
  const statusConfig = TASK_STATUS_CONFIG[task.status]

  const formatRelativeTime = (isoString: string): string => {
    const now = new Date("2026-02-26T16:00:00Z")
    const date = new Date(isoString)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHrs = Math.floor(diffMins / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    const diffDays = Math.floor(diffHrs / 24)
    return `${diffDays}d ago`
  }

  const formatSpend = (value: number): string => {
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}k`
    return `$${value.toFixed(2)}`
  }

  const PRIORITY_CONFIG = {
    low: "bg-muted-foreground/15 text-muted-foreground",
    medium: "bg-chart-1/15 text-chart-1",
    high: "bg-chart-3/15 text-chart-3",
    critical: "bg-destructive/15 text-destructive-foreground",
  } as const

  return (
    <tr
      draggable={!sortActive}
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, task.id)}
      onDrop={(e) => onDrop(e, task.id)}
      onClick={() => onClick?.(task)}
      className={cn(
        "group border-b border-border transition-colors hover:bg-secondary/30 cursor-pointer",
        isDragging && "opacity-50 bg-secondary/20",
        isDragOver && "border-t-2 border-t-primary"
      )}
    >
      <td className="px-2 py-3">
        {!sortActive && (
          <GripVertical className="size-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing" />
        )}
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{task.title}</p>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {task.description}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge
          variant="secondary"
          className={cn(
            "rounded-md text-[11px] font-medium border-0",
            statusConfig.color
          )}
        >
          {statusConfig.label}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <Badge
          variant="secondary"
          className={cn(
            "rounded-sm px-1.5 py-0 text-[10px] font-semibold uppercase border-0",
            PRIORITY_CONFIG[task.priority]
          )}
        >
          {task.priority}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-foreground">{task.assignee}</span>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-foreground">
          {formatSpend(task.cost)}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="font-mono text-xs text-muted-foreground">
          {task.createdAt}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="font-mono text-xs text-muted-foreground">
          {formatRelativeTime(task.lastActivity)}
        </span>
      </td>
    </tr>
  )
}
