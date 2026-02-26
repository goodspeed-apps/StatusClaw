"use client"

import { models } from "@/lib/mock-data"
import { ModelRow } from "./model-card"
import { SpendDisplay } from "./spend-display"
import { SpendChart } from "./spend-chart"
import { LastUpdatedBar } from "./last-updated-bar"
import { DollarSign } from "lucide-react"

export function ModelsTab() {
  const overallModelSpend = {
    day: models.reduce((sum, m) => sum + m.spend.day, 0),
    week: models.reduce((sum, m) => sum + m.spend.week, 0),
    month: models.reduce((sum, m) => sum + m.spend.month, 0),
    total: models.reduce((sum, m) => sum + m.spend.total, 0),
  }

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
              Total Model Spend
            </h3>
          </div>
          <SpendDisplay spend={overallModelSpend} compact />
        </div>

        {/* Right: chart */}
        <SpendChart mode="models" />
      </div>

      {/* Models List */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-accent shadow-[0_0_8px_var(--glow-accent)]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Models
          </h2>
          <span className="text-xs text-muted-foreground font-mono">
            ({models.length})
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {models.map((model) => (
            <ModelRow key={model.id} model={model} />
          ))}
        </div>
      </section>
    </div>
  )
}
