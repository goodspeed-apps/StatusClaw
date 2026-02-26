"use client"

import { useTheme } from "next-themes"
import { Moon, Sun, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useEffect, useState, useCallback } from "react"

export function DashboardHeader() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [workingCount, setWorkingCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetchWorkingCount()
  }, [])

  const fetchWorkingCount = async () => {
    try {
      const res = await fetch('/api/agents', { cache: 'no-store' })
      const data = await res.json()
      setWorkingCount(data.workingCount || 0)
    } catch (error) {
      console.error('Failed to fetch working count:', error)
    }
  }

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch('/api/refresh', { method: 'POST' })
      if (res.ok) {
        // Reload page to get fresh data
        window.location.reload()
      }
    } catch (error) {
      console.error('Refresh failed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  return (
    <header className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-[0_0_15px_var(--glow-primary)]">
          <Image
            src="/logo.jpg"
            alt="StatusClaw logo"
            width={40}
            height={40}
            className="object-cover"
          />
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
            StatusClaw
          </h1>
          <p className="text-[10px] font-medium text-muted-foreground font-mono truncate sm:text-[11px]">
            <span className="hidden sm:inline">OpenClaw Dashboard for </span>Goodspeed.App
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 sm:flex">
          <div className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_var(--glow-accent)]" />
          <span className="text-xs font-medium text-muted-foreground font-mono">
            {workingCount} agents working
          </span>
        </div>
        
        {/* Refresh Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="relative h-9 w-9 rounded-lg"
          aria-label="Refresh data"
        >
          <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
        
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative h-9 w-9 rounded-lg"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </Button>
        )}
      </div>
    </header>
  )
}
