import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// GET /api/admin/performance/avg-history - Get average score history for sparkline
export async function GET() {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    // Get all score history records grouped by date
    const history = await prisma.score_history.findMany({
      orderBy: { recorded_at: 'asc' },
      select: {
        score: true,
        recorded_at: true,
      },
    })

    // Group by week and calculate average
    const weeklyAverages: { date: string; avg: number }[] = []
    const grouped: Record<string, number[]> = {}

    for (const record of history) {
      // Get the start of the week
      const date = new Date(record.recorded_at)
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - date.getDay()) // Start of week
      const weekKey = date.toISOString().slice(0, 10)

      if (!grouped[weekKey]) {
        grouped[weekKey] = []
      }
      grouped[weekKey].push(record.score)
    }

    // Calculate averages and sort by date
    const sortedWeeks = Object.keys(grouped).sort()
    for (const week of sortedWeeks.slice(-12)) { // Last 12 weeks
      const scores = grouped[week]
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      weeklyAverages.push({ date: week, avg })
    }

    return NextResponse.json({
      history: weeklyAverages.map(w => w.avg),
    })
  } catch (error) {
    console.error('Failed to fetch avg score history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch avg score history' },
      { status: 500 }
    )
  }
}
