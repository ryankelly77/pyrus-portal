import Stripe from 'stripe'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover' as any,
})

async function debug() {
  const subscriptions = await stripe.subscriptions.list({
    status: 'active',
    limit: 100,
    expand: ['data.items.data.price', 'data.discounts', 'data.customer'],
  })

  console.log('=== ACTIVE SUBSCRIPTIONS ===')
  console.log('Total active:', subscriptions.data.length)
  console.log('')

  let totalMRR = 0

  for (const sub of subscriptions.data) {
    const customer = sub.customer as Stripe.Customer
    console.log(`Subscription: ${sub.id}`)
    console.log(`  Customer: ${customer?.name || customer?.email || sub.customer}`)
    console.log(`  Status: ${sub.status}`)
    console.log(`  Created: ${new Date(sub.created * 1000).toISOString()}`)

    let subTotal = 0
    console.log('  Items:')
    for (const item of sub.items.data) {
      const price = item.price
      const quantity = item.quantity || 1
      const unitAmount = price.unit_amount || 0
      const interval = price.recurring?.interval || 'one-time'

      let monthlyAmount = 0
      if (interval === 'month') {
        monthlyAmount = (unitAmount * quantity) / 100
      } else if (interval === 'year') {
        monthlyAmount = (unitAmount * quantity) / 100 / 12
      }

      console.log(`    - ${price.nickname || price.id}: $${unitAmount/100} x ${quantity} (${interval}) = $${monthlyAmount}/mo`)
      subTotal += monthlyAmount
    }

    // Check for discount
    console.log(`  Discount data:`, JSON.stringify(sub.discounts, null, 2))
    const discount = sub.discounts?.[0] as { coupon?: { id: string; percent_off: number | null } } | undefined
    if (discount && discount.coupon) {
      const coupon = discount.coupon
      console.log(`  Discount: ${coupon.id} (${coupon.percent_off}% off)`)
      if (coupon.percent_off) {
        const discountAmount = subTotal * (coupon.percent_off / 100)
        console.log(`    Discount amount: -$${discountAmount}/mo`)
        subTotal = subTotal * (1 - coupon.percent_off / 100)
      }
    } else {
      console.log(`  No discount applied`)
    }

    console.log(`  Monthly Total: $${subTotal}`)
    console.log('')
    totalMRR += subTotal
  }

  console.log('======================')
  console.log(`TOTAL MRR: $${totalMRR.toFixed(2)}`)
}

debug().catch(console.error)

// Also try to get Stripe's billing metrics
async function getStripeMRR() {
  console.log('\n=== STRIPE BILLING METRICS ===')
  try {
    // Try to list recent invoices to see actual amounts
    const invoices = await stripe.invoices.list({
      status: 'paid',
      limit: 20,
    })

    console.log('Recent paid invoices:')
    for (const inv of invoices.data) {
      const date = new Date(inv.created * 1000).toISOString().slice(0, 10)
      console.log(`  ${date}: ${inv.customer_name || inv.customer_email} - $${(inv.amount_paid / 100).toFixed(2)}`)
    }
  } catch (e) {
    console.log('Could not fetch billing metrics:', e)
  }
}

getStripeMRR().catch(console.error)
