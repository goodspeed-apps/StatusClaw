"use client"

import { DashboardHeader } from "@/components/dashboard/header"
import { AgentsTab } from "@/components/dashboard/agents-tab"
import { ModelsTab } from "@/components/dashboard/models-tab"
import { TasksTab } from "@/components/dashboard/tasks-tab"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Bot, Server, KanbanSquare } from "lucide-react"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Tabs defaultValue="agents" className="gap-6">
          <TabsList className="h-10 bg-secondary/50 border border-border p-1">
            <TabsTrigger
              value="agents"
              className="gap-1.5 px-2 sm:px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_12px_var(--glow-primary)]"
            >
              <Bot className="size-3.5" />
              <span className="hidden sm:inline">Agents</span>
            </TabsTrigger>
            <TabsTrigger
              value="models"
              className="gap-1.5 px-2 sm:px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_12px_var(--glow-primary)]"
            >
              <Server className="size-3.5" />
              <span className="hidden sm:inline">Models</span>
            </TabsTrigger>
            <TabsTrigger
              value="tasks"
              className="gap-1.5 px-2 sm:px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_12px_var(--glow-primary)]"
            >
              <KanbanSquare className="size-3.5" />
              <span className="hidden sm:inline">Tasks</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agents">
            <AgentsTab />
          </TabsContent>

          <TabsContent value="models">
            <ModelsTab />
          </TabsContent>

          <TabsContent value="tasks">
            <TasksTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer pulse line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
    </div>
  )
}
