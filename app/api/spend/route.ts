import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const history = generateSpendHistory()
    const current = {
      day: history[history.length - 1]?.total || 0,
      week: history.slice(-7).reduce((sum, d) => sum + d.total, 0),
      month: history.reduce((sum, d) => sum + d.total, 0),
      total: history[history.length - 1]?.cumulative || 14200,
    }

    return NextResponse.json({
      current,
      history,
      byAgent: getSpendByAgent(),
      byModel: getSpendByModel(),
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to fetch spend data' }, { status: 500 })
  }
}

function generateSpendHistory() {
  const agentIds = ['atlas','architect','backend_eng','cfo','cmo','cto','pm','mobile_eng','revenue_ops','security','side_hustle_studio','web_eng']
  const baseSpend: Record<string, number> = {
    atlas: 12, architect: 8.5, backend_eng: 10.5, cfo: 1.5, cmo: 5, cto: 11,
    pm: 4, mobile_eng: 2, revenue_ops: 3, security: 6.5, side_hustle_studio: 1.2, web_eng: 2.5
  }
  const days: any[] = []
  let cumulative = 14200

  for (let i = 0; i < 30; i++) {
    const d = new Date()
    d.setDate(d.getDate() - 29 + i)
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    
    const byAgent: Record<string, number> = {}
    const byModel: Record<string, number> = {
      'claude-opus-4': 0,
      'claude-sonnet-4': 0,
      'gpt-5-mini': 0,
      'gemini-3-flash': 0
    }

    let total = 0
    const modelMap: Record<string, string> = {
      atlas: 'claude-opus-4', architect: 'claude-opus-4', backend_eng: 'claude-sonnet-4',
      cfo: 'gpt-5-mini', cmo: 'claude-sonnet-4', cto: 'claude-opus-4',
      pm: 'gpt-5-mini', mobile_eng: 'claude-sonnet-4', revenue_ops: 'gpt-5-mini',
      security: 'claude-opus-4', side_hustle_studio: 'gemini-3-flash', web_eng: 'claude-sonnet-4'
    }

    for (const id of agentIds) {
      const variance = 0.5 + Math.abs(Math.sin(i * 13.37 + id.length * 7.91)) * 1.2
      const val = +(baseSpend[id] * variance).toFixed(2)
      byAgent[id] = val
      byModel[modelMap[id]] = +(byModel[modelMap[id]] + val).toFixed(2)
      total += val
    }

    total = +total.toFixed(2)
    cumulative = +(cumulative + total).toFixed(2)
    days.push({ date: label, total, cumulative, byAgent, byModel })
  }

  return days
}

function getSpendByAgent() {
  return {
    atlas: { day: 14.20, week: 89.50, month: 362.80, total: 3247.50 },
    architect: { day: 9.80, week: 61.20, month: 248.40, total: 1823.20 },
    backend_eng: { day: 11.30, week: 72.40, month: 298.60, total: 2156.80 },
    cfo: { day: 0.00, week: 18.90, month: 94.30, total: 687.40 },
    cmo: { day: 5.60, week: 34.80, month: 142.10, total: 921.30 },
    cto: { day: 12.70, week: 82.30, month: 334.50, total: 2891.60 },
    pm: { day: 4.90, week: 29.60, month: 118.70, total: 812.50 },
    mobile_eng: { day: 0.00, week: 22.10, month: 108.40, total: 743.20 },
    revenue_ops: { day: 3.40, week: 21.80, month: 89.60, total: 534.70 },
    security: { day: 7.20, week: 45.60, month: 186.30, total: 1342.90 },
    side_hustle_studio: { day: 0.00, week: 12.40, month: 56.80, total: 398.60 },
    web_eng: { day: 8.50, week: 54.30, month: 221.40, total: 1612.30 },
  }
}

function getSpendByModel() {
  return {
    'claude-opus-4': { day: 43.90, week: 278.60, month: 1131.00, total: 9305.20 },
    'claude-sonnet-4': { day: 25.40, week: 183.60, month: 770.50, total: 5433.50 },
    'gpt-5-mini': { day: 8.30, week: 70.30, month: 302.60, total: 2034.60 },
    'gemini-3-flash': { day: 0.00, week: 12.40, month: 56.80, total: 398.60 },
  }
}
