import { cn } from "@/lib/utils"

interface SpendDisplayProps {
  spend: {
    day: number
    week: number
    month: number
    total: number
  }
  compact?: boolean
}

export function formatSpend(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `$${(value / 1_000).toFixed(1)}k`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}k`
  return `$${value.toFixed(2)}`
}

export function SpendDisplay({ spend, compact = false }: SpendDisplayProps) {
  const periods = [
    { label: "24h", value: spend.day },
    { label: "7d", value: spend.week },
    { label: "30d", value: spend.month },
    { label: "Total", value: spend.total },
  ]

  return (
    <div
      className={cn(
        "grid gap-2",
        compact ? "grid-cols-4" : "grid-cols-2 sm:grid-cols-4"
      )}
    >
      {periods.map((period) => (
        <div
          key={period.label}
          className={cn(
            "rounded-md border border-border bg-secondary/40 px-2.5 py-1.5 overflow-hidden",
            compact && "px-2 py-1"
          )}
        >
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {period.label}
          </p>
          <p
            className={cn(
              "font-mono font-semibold text-foreground truncate",
              compact ? "text-xs" : "text-sm"
            )}
            title={`$${period.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          >
            {formatSpend(period.value)}
          </p>
        </div>
      ))}
    </div>
  )
}
