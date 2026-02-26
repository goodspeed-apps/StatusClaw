// App data refresh system - coordinates auto-refresh and manual refresh

import { taskStore } from './task-store'

const REFRESH_INTERVAL = 15 * 60 * 1000 // 15 minutes

interface RefreshState {
  lastRefresh: string
  isRefreshing: boolean
  nextScheduled: string
}

class RefreshManager {
  private intervalId: NodeJS.Timeout | null = null
  private state: RefreshState

  constructor() {
    this.state = {
      lastRefresh: new Date().toISOString(),
      isRefreshing: false,
      nextScheduled: this.calculateNextRefresh(),
    }
  }

  private calculateNextRefresh(): string {
    return new Date(Date.now() + REFRESH_INTERVAL).toISOString()
  }

  startAutoRefresh() {
    if (this.intervalId) return
    
    this.intervalId = setInterval(() => {
      this.performRefresh()
    }, REFRESH_INTERVAL)
    
    console.log('[RefreshManager] Auto-refresh started (15 min intervals)')
  }

  stopAutoRefresh() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('[RefreshManager] Auto-refresh stopped')
    }
  }

  async performRefresh(): Promise<boolean> {
    if (this.state.isRefreshing) {
      console.log('[RefreshManager] Refresh already in progress, skipping...')
      return false
    }

    this.state.isRefreshing = true
    console.log('[RefreshManager] Performing data refresh...')

    try {
      // 1. Sync tasks with QUEUE.md
      await taskStore.syncWithQueueMd()
      
      this.state.lastRefresh = new Date().toISOString()
      this.state.nextScheduled = this.calculateNextRefresh()
      
      console.log('[RefreshManager] Refresh completed successfully')
      return true
    } catch (error) {
      console.error('[RefreshManager] Refresh failed:', error)
      return false
    } finally {
      this.state.isRefreshing = false
    }
  }

  getState(): RefreshState {
    return { ...this.state }
  }
}

export const refreshManager = new RefreshManager()

// Initialize on module load if in server context
if (typeof window === 'undefined') {
  refreshManager.startAutoRefresh()
}
