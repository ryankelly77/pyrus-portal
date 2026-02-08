import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { getStripeMRRData, getStripeInvoices } from '@/lib/stripe-mrr-cache'

export const dynamic = 'force-dynamic';

interface MRRDataPoint {
  month: string
  label: string
  mrr: number
}

interface VolumeDataPoint {
  month: string
  label: string
  volume: number
  cumulative: number
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    // Get cached Stripe data
    const stripeData = await getStripeMRRData()
    const allSubscriptions = stripeData.subscriptions

    // Build maps for date tracking
    const subStartDates: Map<string, Date> = new Map()
    const subEndDates: Map<string, Date> = new Map()

    // Find the earliest subscription start date
    let earliestDate = new Date()

    for (const sub of allSubscriptions) {
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
      // Use local year-month format to avoid timezone issues
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      months.push({
        month: `${year}-${month}`,
        label: date.toLocaleDateString('en-US', { month: 'short' }),
        mrr: 0
      })
    }

    // Calculate MRR for each month
    for (const sub of allSubscriptions) {
      const subStart = subStartDates.get(sub.id)!
      const subEnd = subEndDates.get(sub.id)!
      const monthlyAmount = sub.monthlyAmount

      for (const monthData of months) {
        // Parse year-month and create local date (avoid UTC parsing issues)
        const [year, month] = monthData.month.split('-').map(Number)
        const monthStart = new Date(year, month - 1, 1)
        const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)

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

    // Get cached invoices for net volume
    const allInvoices = await getStripeInvoices()

    // Build volume data by month
    const volumeByMonth: Map<string, number> = new Map()
    let totalNetVolume = 0

    for (const invoice of allInvoices) {
      const invoiceDate = new Date(invoice.created * 1000)
      const year = invoiceDate.getFullYear()
      const month = String(invoiceDate.getMonth() + 1).padStart(2, '0')
      const monthKey = `${year}-${month}`

      const amount = invoice.amount_paid / 100
      volumeByMonth.set(monthKey, (volumeByMonth.get(monthKey) || 0) + amount)
      totalNetVolume += amount
    }

    // Build volume chart data (cumulative)
    const volumeData: VolumeDataPoint[] = []
    let cumulativeVolume = 0
    for (const monthData of months) {
      const monthVolume = volumeByMonth.get(monthData.month) || 0
      cumulativeVolume += monthVolume
      volumeData.push({
        month: monthData.month,
        label: monthData.label,
        volume: Math.round(monthVolume),
        cumulative: Math.round(cumulativeVolume)
      })
    }

    // Calculate churn using actual invoice amounts (real MRR lost)
    const canceledSubs = allSubscriptions.filter(s =>
      s.status === 'canceled' && s.monthlyAmount > 0
    )
    const totalPaidSubs = allSubscriptions.filter(s => s.monthlyAmount > 0)

    // Churn rate = canceled / total (as percentage)
    const churnRate = totalPaidSubs.length > 0
      ? (canceledSubs.length / totalPaidSubs.length) * 100
      : 0

    // Lost MRR from churned customers
    let churnedMRR = 0
    for (const sub of canceledSubs) {
      churnedMRR += sub.monthlyAmount
    }

    const churnedCount = canceledSubs.length

    return NextResponse.json({
      chartData: months,
      currentMRR: stripeData.currentMRR,
      mrrChange: Math.round(mrrChange),
      avgGrowthPercent: Math.round(avgGrowthPercent * 10) / 10,
      totalSubscriptions: allSubscriptions.filter(s => s.status === 'active').length,
      // Net volume data
      volumeData,
      totalNetVolume: Math.round(totalNetVolume * 100) / 100,
      // Churn data
      churnRate: Math.round(churnRate * 10) / 10,
      churnedSubscriptions: churnedCount,
      churnedMRR: Math.round(churnedMRR)
    })
  } catch (error) {
    console.error('MRR API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch MRR data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
