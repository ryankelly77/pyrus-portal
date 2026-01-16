import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover' as any,
})

async function debug() {
  // Get all subscriptions
  const allSubscriptions = await stripe.subscriptions.list({
    status: 'all',
    limit: 100,
  })

  const subMonthlyAmounts: Map<string, number> = new Map()
  const subStartDates: Map<string, Date> = new Map()
  const subEndDates: Map<string, Date> = new Map()

  let earliestDate = new Date()

  for (const sub of allSubscriptions.data) {
    const startDate = new Date(sub.created * 1000)
    subStartDates.set(sub.id, startDate)

    if (startDate < earliestDate) {
      earliestDate = startDate
    }

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
      subMonthlyAmounts.set(sub.id, 0)
    }

    const customer = await stripe.customers.retrieve(sub.customer as string) as any
    console.log(`Sub: ${customer.name || customer.email}`)
    console.log(`  Created: ${startDate.toISOString()}`)
    console.log(`  Amount: $${subMonthlyAmounts.get(sub.id)}`)
    console.log(`  Status: ${sub.status}`)
    console.log('')
  }

  console.log('=== EARLIEST DATE ===')
  console.log(earliestDate.toISOString())
  console.log('')

  // Generate months
  const now = new Date()
  const startMonth = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1)
  const endMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const monthsDiff = (endMonth.getFullYear() - startMonth.getFullYear()) * 12 +
                     (endMonth.getMonth() - startMonth.getMonth()) + 1

  console.log('=== MONTHS ===')
  for (let i = 0; i < monthsDiff; i++) {
    const date = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1)
    const monthStart = date
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)

    let monthMRR = 0
    for (const sub of allSubscriptions.data) {
      const subStart = subStartDates.get(sub.id)!
      const subEnd = subEndDates.get(sub.id)!
      const monthlyAmount = subMonthlyAmounts.get(sub.id) || 0

      if (subStart <= monthEnd && subEnd >= monthStart) {
        monthMRR += monthlyAmount
      }
    }

    console.log(`${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}: $${Math.round(monthMRR)}`)
  }
}

debug().catch(console.error)
