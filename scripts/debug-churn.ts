import 'dotenv/config'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-12-15.clover' })

async function debug() {
  const allSubscriptions = await stripe.subscriptions.list({
    status: 'all',
    limit: 100,
  })

  console.log('\n=== Canceled Subscriptions Details ===')
  for (const sub of allSubscriptions.data) {
    if (sub.status === 'canceled') {
      const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer
      const name = customer.name || customer.email || 'Unknown'

      console.log('\n' + name + ':')
      console.log('  Canceled at: ' + new Date(sub.canceled_at! * 1000).toISOString())

      // Get all paid invoices for this subscription
      const invoices = await stripe.invoices.list({
        subscription: sub.id,
        status: 'paid',
        limit: 10,
      })

      console.log('  Paid invoices:')
      let totalPaid = 0
      for (const inv of invoices.data) {
        console.log('    ' + new Date(inv.created * 1000).toISOString().split('T')[0] + ': $' + (inv.amount_paid / 100))
        totalPaid += inv.amount_paid / 100
      }
      console.log('  Total paid: $' + totalPaid)

      // Check subscription items
      console.log('  Subscription items:')
      for (const item of sub.items.data) {
        const price = item.price
        const amount = (price.unit_amount || 0) / 100
        console.log('    ' + price.nickname + ': $' + amount + '/' + price.recurring?.interval)
      }
    }
  }
}

debug().catch(console.error)
