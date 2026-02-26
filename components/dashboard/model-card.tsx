"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import type { LLMModel, Agent } from "@/lib/mock-data"
import { agents } from "@/lib/mock-data"
import { formatSpend } from "./spend-display"
import { Bot, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import Image from "next/image"

type SortKey = "agent" | "day" | "week" | "month" | "total"
type SortDir = "asc" | "desc"

export function ModelRow({ model }: { model: LLMModel }) {
  const [expanded, setExpanded] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>("total")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const assignedAgents = agents.filter((a) => a.model === model.id)

  const sortedAgents = useMemo(() => {
    return [...assignedAgents].sort((a, b) => {
      let cmp = 0
      if (sortKey === "agent") {
        cmp = a.name.localeCompare(b.name)
      } else if (sortKey === "day") {
        cmp = a.spend.day - b.spend.day
      } else if (sortKey === "week") {
        cmp = a.spend.week - b.spend.week
      } else if (sortKey === "month") {
        cmp = a.spend.month - b.spend.month
      } else {
        cmp = a.spend.total - b.spend.total
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [assignedAgents, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir(key === "agent" ? "asc" : "desc")
    }
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) {
      return <ArrowUpDown className="size-3 text-muted-foreground/50" />
    }
    return sortDir === "asc" ? (
      <ArrowUp className="size-3 text-primary" />
    ) : (
      <ArrowDown className="size-3 text-primary" />
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card transition-all duration-200 border-l-[3px] border-l-chart-1 hover:shadow-[0_2px_12px_var(--glow-primary)] overflow-hidden">
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-3 py-3 cursor-pointer sm:gap-4 sm:px-4"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        {/* Provider avatar */}
        <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg sm:size-12">
          <Image
            src={model.avatar}
            alt={`${model.provider} logo`}
            width={48}
            height={48}
            className="size-full object-cover rounded-lg"
          />
        </div>

        {/* Name & Provider */}
        <div className="min-w-0 flex-1 sm:flex-none sm:w-40">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {model.name}
          </h3>
          <p className="text-[11px] text-muted-foreground truncate">{model.provider}</p>
        </div>

        {/* Agent count */}
        <div className="hidden w-28 shrink-0 items-center gap-1.5 sm:flex">
          <Bot className="size-3 text-muted-foreground" />
          <span className="text-[11px] font-medium text-muted-foreground">
            {model.agentCount} {model.agentCount === 1 ? "agent" : "agents"}
          </span>
        </div>

        {/* Compact spend (md+) */}
        <div className="ml-auto hidden items-center gap-6 lg:gap-8 md:flex">
          {[
            { label: "24h", value: model.spend.day },
            { label: "7d", value: model.spend.week },
            { label: "30d", value: model.spend.month },
            { label: "Total", value: model.spend.total },
          ].map((p) => (
            <div key={p.label} className="text-right min-w-[52px]">
              <p className="text-[9px] uppercase text-muted-foreground/70">{p.label}</p>
              <p className="font-mono text-xs font-semibold text-foreground">{formatSpend(p.value)}</p>
            </div>
          ))}
        </div>

        {/* Chevron */}
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-180"
          )}
        />
      </div>

      {/* Expanded panel: per-agent spend breakdown */}
      {expanded && (
        <div className="border-t border-border bg-secondary/10 px-3 py-3 sm:px-4">
          {/* Mobile-only spend */}
          <div className="mb-3 grid grid-cols-4 gap-2 md:hidden">
            {[
              { label: "24h", value: model.spend.day },
              { label: "7d", value: model.spend.week },
              { label: "30d", value: model.spend.month },
              { label: "Total", value: model.spend.total },
            ].map((p) => (
              <div key={p.label} className="rounded-md border border-border bg-secondary/40 px-2 py-1 overflow-hidden">
                <p className="text-[9px] uppercase text-muted-foreground/70">{p.label}</p>
                <p className="font-mono text-xs font-semibold text-foreground truncate">{formatSpend(p.value)}</p>
              </div>
            ))}
          </div>

          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Agent Spend Breakdown
          </h4>
          {assignedAgents.length === 0 ? (
            <p className="text-xs italic text-muted-foreground/50">No agents assigned.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th 
                      className="py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort("agent")}
                    >
                      <span className="flex items-center gap-1">
                        Agent
                        <SortIcon column="agent" />
                      </span>
                    </th>
                    <th 
                      className="py-1.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort("day")}
                    >
                      <span className="flex items-center justify-end gap-1">
                        24h
                        <SortIcon column="day" />
                      </span>
                    </th>
                    <th 
                      className="py-1.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort("week")}
                    >
                      <span className="flex items-center justify-end gap-1">
                        7d
                        <SortIcon column="week" />
                      </span>
                    </th>
                    <th 
                      className="py-1.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort("month")}
                    >
                      <span className="flex items-center justify-end gap-1">
                        30d
                        <SortIcon column="month" />
                      </span>
                    </th>
                    <th 
                      className="py-1.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort("total")}
                    >
                      <span className="flex items-center justify-end gap-1">
                        Total
                        <SortIcon column="total" />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAgents.map((agent) => (
                    <tr key={agent.id} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="size-5 shrink-0 overflow-hidden rounded">
                            <Image src={agent.avatar} alt={agent.name} width={20} height={20} className="size-full object-cover" />
                          </div>
                          <span className="font-medium text-foreground">{agent.name}</span>
                        </div>
                      </td>
                      <td className="py-1.5 text-right font-mono text-muted-foreground">{formatSpend(agent.spend.day)}</td>
                      <td className="py-1.5 text-right font-mono text-muted-foreground">{formatSpend(agent.spend.week)}</td>
                      <td className="py-1.5 text-right font-mono text-muted-foreground">{formatSpend(agent.spend.month)}</td>
                      <td className="py-1.5 text-right font-mono font-semibold text-foreground">{formatSpend(agent.spend.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
