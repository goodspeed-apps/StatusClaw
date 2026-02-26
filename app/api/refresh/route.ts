import { NextResponse } from 'next/server'
import { refreshManager } from '@/lib/refresh-manager'
import { taskStore } from '@/lib/task-store'

export const dynamic = 'force-dynamic'

// POST - Trigger manual refresh
export async function POST() {
  try {
    console.log('[API] Manual refresh triggered')
    
    // Perform refresh
    const success = await refreshManager.performRefresh()
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Data refreshed successfully',
        lastRefresh: refreshManager.getState().lastRefresh
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Refresh failed or already in progress'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Refresh API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to refresh data' 
    }, { status: 500 })
  }
}

// GET - Get refresh status
export async function GET() {
  try {
    const state = refreshManager.getState()
    
    return NextResponse.json({
      lastRefresh: state.lastRefresh,
      nextScheduled: state.nextScheduled,
      isRefreshing: state.isRefreshing,
    })
  } catch (error) {
    console.error('Refresh status API error:', error)
    return NextResponse.json({ error: 'Failed to get refresh status' }, { status: 500 })
  }
}
