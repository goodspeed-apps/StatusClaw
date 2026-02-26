"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { dailySpendHistory, agents, models } from "@/lib/mock-data"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts"
import { BarChart3, TrendingUp } from "lucide-react"

type ChartMode = "line" | "bar-agent" | "bar-model"
type TimeRange = "7d" | "14d" | "30d" | "all"

const AGENT_COLORS: Record<string, string> = {
  atlas: "oklch(0.65 0.27 260)",
  architect: "oklch(0.7 0.22 330)",
  backend_eng: "oklch(0.75 0.2 175)",
  cfo: "oklch(0.8 0.15 85)",
  cmo: "oklch(0.65 0.2 30)",
  cto: "oklch(0.6 0.25 280)",
  pm: "oklch(0.72 0.18 145)",
  mobile_eng: "oklch(0.68 0.2 200)",
  revenue_ops: "oklch(0.78 0.16 60)",
  security: "oklch(0.6 0.22 15)",
  side_hustle_studio: "oklch(0.75 0.18 310)",
  web_eng: "oklch(0.7 0.22 240)",
}

const MODEL_COLORS: Record<string, string> = {
  "claude-opus-4": "oklch(0.65 0.27 260)",
  "claude-sonnet-4": "oklch(0.75 0.2 175)",
  "gpt-5-mini": "oklch(0.8 0.15 85)",
  "gemini-3-flash": "oklch(0.65 0.2 30)",
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="mb-1.5 text-xs font-semibold text-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-[11px]">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-mono font-semibold text-foreground">
            ${entry.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      ))}
    </div>
  )
}

const TIME_RANGES: { key: TimeRange; label: string; days: number }[] = [
  { key: "7d", label: "7d", days: 7 },
  { key: "14d", label: "14d", days: 14 },
  { key: "30d", label: "30d", days: 30 },
  { key: "all", label: "All", days: 9999 },
]

interface SpendChartProps {
  mode: "agents" | "models"
}

export function SpendChart({ mode: tabMode }: SpendChartProps) {
  const defaultChart: ChartMode =
    tabMode === "agents" ? "bar-agent" : "bar-model"
  const [chartMode, setChartMode] = useState<ChartMode>(defaultChart)
  const [timeRange, setTimeRange] = useState<TimeRange>("14d")

  const slicedData = useMemo(() => {
    const rangeConfig = TIME_RANGES.find((r) => r.key === timeRange)!
    const days = Math.min(rangeConfig.days, dailySpendHistory.length)
    return dailySpendHistory.slice(-days)
  }, [timeRange])

  const barAgentData = slicedData.map((d) => ({ date: d.date, ...d.byAgent }))
  const barModelData = slicedData.map((d) => ({ date: d.date, ...d.byModel }))
  const lineData = slicedData.map((d) => ({ date: d.date, cumulative: d.cumulative }))

  const chartOptions: { key: ChartMode; label: string; icon: typeof TrendingUp }[] =
    tabMode === "agents"
      ? [
          { key: "bar-agent", label: "By Agent", icon: BarChart3 },
          { key: "line", label: "Overall", icon: TrendingUp },
        ]
      : [
          { key: "bar-model", label: "By Model", icon: BarChart3 },
          { key: "line", label: "Overall", icon: TrendingUp },
        ]

  const showTimeRange = chartMode !== "line"

  return (
    <div className="rounded-xl border border-border bg-card p-4 h-full flex flex-col">
      <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Spend
          </h3>
          {/* Time range selectors (only for bar charts) */}
          {showTimeRange && (
            <div className="flex items-center rounded-md border border-border bg-secondary/30 p-0.5">
              {TIME_RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setTimeRange(r.key)}
                  className={cn(
                    "rounded-sm px-2 py-0.5 text-[10px] font-medium transition-all",
                    timeRange === r.key
                      ? "bg-primary text-primary-foreground shadow-[0_0_6px_var(--glow-primary)]"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center rounded-lg border border-border bg-secondary/30 p-0.5">
          {chartOptions.map((opt) => {
            const Icon = opt.icon
            return (
              <button
                key={opt.key}
                onClick={() => setChartMode(opt.key)}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-all",
                  chartMode === opt.key
                    ? "bg-primary text-primary-foreground shadow-[0_0_8px_var(--glow-primary)]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-2.5" />
                <span>{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0" style={{ minHeight: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === "line" ? (
            <AreaChart data={lineData}>
              <defs>
                <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulative"
                name="Cumulative Spend"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#cumGrad)"
                dot={{ r: 2, fill: "var(--primary)" }}
                activeDot={{
                  r: 4,
                  fill: "var(--primary)",
                  stroke: "var(--background)",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          ) : chartMode === "bar-agent" ? (
            <BarChart data={barAgentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}`}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 9 }}
                iconSize={6}
                formatter={(value: string) => (
                  <span className="text-[9px] text-muted-foreground">
                    {value}
                  </span>
                )}
              />
              {agents.map((agent) => (
                <Bar
                  key={agent.id}
                  dataKey={agent.id}
                  name={agent.name}
                  stackId="a"
                  fill={AGENT_COLORS[agent.id]}
                  radius={0}
                />
              ))}
            </BarChart>
          ) : (
            <BarChart data={barModelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}`}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 9 }}
                iconSize={6}
                formatter={(value: string) => (
                  <span className="text-[9px] text-muted-foreground">
                    {value}
                  </span>
                )}
              />
              {models.map((model) => (
                <Bar
                  key={model.id}
                  dataKey={model.id}
                  name={model.name}
                  stackId="a"
                  fill={MODEL_COLORS[model.id]}
                  radius={0}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
