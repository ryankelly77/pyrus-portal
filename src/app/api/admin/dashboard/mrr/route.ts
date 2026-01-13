import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

interface MRRDataPoint {
  month: string
  label: string
  mrr: number
}

export async function GET() {
  try {
    // Get all subscriptions (active and canceled) for historical data
    const allSubscriptions = await stripe.subscriptions.list({
      status: 'all',
      limit: 100,
    })

    // Build a map of subscription -> actual monthly amount from invoices
    const subMonthlyAmounts: Map<string, number> = new Map()
    const subStartDates: Map<string, Date> = new Map()
    const subEndDates: Map<string, Date> = new Map()

    // Find the earliest subscription start date
    let earliestDate = new Date()

    for (const sub of allSubscriptions.data) {
      const startDate = new Date(sub.created * 1000)
      subStartDates.set(sub.id, startDate)

      if (startDate < earliestDate) {
        earliestDate = startDate
      }

      // Get end date if canceled
      if (sub.canceled_at) {
        subEndDates.set(sub.id, new Date(sub.canceled_at * 1000))
      } else if (sub.ended_at) {
        subEndDates.set(sub.id, new Date(sub.ended_at * 1000))
      } else {
        subEndDates.set(sub.id, new Date(9999, 11, 31))
      }

      // Get the actual amount from the most recent invoice
      const invoices = await stripe.invoices.list({
        subscription: sub.id,
        status: 'paid',
        limit: 1,
      })

      if (invoices.data.length > 0) {
        subMonthlyAmounts.set(sub.id, invoices.data[0].amount_paid / 100)
      } else {
        // Fallback to subscription item prices if no invoice
        let monthlyAmount = 0
        for (const item of sub.items.data) {
          const price = item.price
          const quantity = item.quantity || 1
          const unitAmount = price.unit_amount || 0

          if (price.recurring?.interval === 'month') {
            monthlyAmount += (unitAmount * quantity) / 100
          } else if (price.recurring?.interval === 'year') {
            monthlyAmount += (unitAmount * quantity) / 100 / 12
          }
        }
        subMonthlyAmounts.set(sub.id, monthlyAmount)
      }
    }

    // Generate months from earliest subscription to now
    const now = new Date()
    const months: MRRDataPoint[] = []

    // Start from the first of the earliest month
    const startMonth = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1)
    const endMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Calculate number of months
    const monthsDiff = (endMonth.getFullYear() - startMonth.getFullYear()) * 12 +
                       (endMonth.getMonth() - startMonth.getMonth()) + 1

    // Generate all months from start to now
    for (let i = 0; i < monthsDiff; i++) {
      const date = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1)
      months.push({
        month: date.toISOString().slice(0, 7),
        label: date.toLocaleDateString('en-US', { month: 'short' }),
        mrr: 0
      })
    }

    // Calculate MRR for each month
    for (const sub of allSubscriptions.data) {
      const subStart = subStartDates.get(sub.id)!
      const subEnd = subEndDates.get(sub.id)!
      const monthlyAmount = subMonthlyAmounts.get(sub.id) || 0

      for (const monthData of months) {
        const monthStart = new Date(monthData.month + '-01')
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59, 999)

        // Subscription was active during this month if it started before month end
        // and ended after month start
        if (subStart <= monthEnd && subEnd >= monthStart) {
          monthData.mrr += monthlyAmount
        }
      }
    }

    // Round MRR values
    for (const monthData of months) {
      monthData.mrr = Math.round(monthData.mrr)
    }

    // Calculate current MRR (sum of active subscriptions only)
    let currentMRR = 0
    for (const sub of allSubscriptions.data) {
      if (sub.status === 'active' || sub.status === 'trialing') {
        currentMRR += subMonthlyAmounts.get(sub.id) || 0
      }
    }

    // Calculate MRR change
    const currentMonthMRR = months[months.length - 1]?.mrr || 0
    const previousMonthMRR = months[months.length - 2]?.mrr || 0
    const mrrChange = currentMonthMRR - previousMonthMRR

    // Calculate average monthly growth rate
    // Find first month with MRR > 0
    const firstNonZeroMonth = months.find(m => m.mrr > 0)
    const firstMRR = firstNonZeroMonth?.mrr || 0
    const lastMRR = currentMonthMRR

    let avgGrowthPercent = 0
    if (firstMRR > 0 && lastMRR > 0) {
      // Find index of first non-zero month
      const firstIndex = months.findIndex(m => m.mrr > 0)
      const monthsElapsed = months.length - 1 - firstIndex

      if (monthsElapsed > 0) {
        // Compound monthly growth rate: (final/initial)^(1/periods) - 1
        avgGrowthPercent = (Math.pow(lastMRR / firstMRR, 1 / monthsElapsed) - 1) * 100
      }
    }

    return NextResponse.json({
      chartData: months,
      currentMRR: Math.round(currentMRR),
      mrrChange: Math.round(mrrChange),
      avgGrowthPercent: Math.round(avgGrowthPercent * 10) / 10, // Round to 1 decimal
      totalSubscriptions: allSubscriptions.data.filter(s => s.status === 'active').length
    })
  } catch (error) {
    console.error('MRR API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch MRR data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
