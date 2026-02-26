"use client"

import { useState, useCallback } from "react"
import { Clock, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

export function LastUpdatedBar() {
  const [updatedAt, setUpdatedAt] = useState(() => new Date())
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    setTimeout(() => {
      setUpdatedAt(new Date())
      setRefreshing(false)
    }, 600)
  }, [])

  const timeString = updatedAt.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  return (
    <div className="flex items-center justify-end gap-2">
      <div className="flex items-center gap-1.5 text-muted-foreground/60">
        <Clock className="size-3" />
        <span className="text-[11px] font-mono">Last updated: {timeString}</span>
      </div>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing}
        className={cn(
          "flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-secondary/70",
          refreshing && "opacity-60"
        )}
      >
        <RefreshCw className={cn("size-3", refreshing && "animate-spin")} />
        Refresh
      </button>
    </div>
  )
}
