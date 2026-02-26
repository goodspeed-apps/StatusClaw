"use client"

import { useState, useCallback } from "react"
import { agents, tasks as initialTasks, type Task } from "@/lib/mock-data"
import { AgentRow } from "./agent-card"
import { SpendDisplay } from "./spend-display"
import { SpendChart } from "./spend-chart"
import { LastUpdatedBar } from "./last-updated-bar"
import { TaskDetailModal } from "./task-detail-modal"
import { DollarSign } from "lucide-react"

export function AgentsTab() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const activeAgents = agents.filter((a) => a.status === "active").length

  const overallSpend = {
    day: agents.reduce((sum, a) => sum + a.spend.day, 0),
    week: agents.reduce((sum, a) => sum + a.spend.week, 0),
    month: agents.reduce((sum, a) => sum + a.spend.month, 0),
    total: agents.reduce((sum, a) => sum + a.spend.total, 0),
  }

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

  return (
    <div className="flex flex-col gap-4">
      <LastUpdatedBar />

      {/* Top row: spend boxes (50%) + chart (50%) on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Left: overall spend card */}
        <div className="rounded-xl border border-border bg-card p-3 h-fit">
          <div className="mb-2 flex items-center gap-2">
            <DollarSign className="size-3.5 text-chart-3" />
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Overall Spend
            </h3>
          </div>
          <SpendDisplay spend={overallSpend} compact />
        </div>

        {/* Right: chart */}
        <SpendChart mode="agents" />
      </div>

      {/* Agents List */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-primary shadow-[0_0_8px_var(--glow-primary)]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Agents <span className="font-mono text-muted-foreground">({activeAgents}/{agents.length} active)</span>
          </h2>
        </div>
        <div className="flex flex-col gap-2">
          {agents.map((agent) => (
            <AgentRow key={agent.id} agent={agent} onTaskClick={handleTaskClick} />
          ))}
        </div>
      </section>

      <TaskDetailModal
        task={selectedTask}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handleTaskSave}
      />
    </div>
  )
}
