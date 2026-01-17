import { stripe } from '../src/lib/stripe'
import { prisma } from '../src/lib/prisma'

async function main() {
  // Find Espronceda Law
  const client = await prisma.clients.findFirst({
    where: {
      name: { contains: 'Espronceda', mode: 'insensitive' }
    },
    select: {
      id: true,
      name: true,
      stripe_customer_id: true,
    }
  })

  if (!client || !client.stripe_customer_id) {
    console.log('Client not found')
    return
  }

  console.log(`\nClient: ${client.name}`)
  console.log(`Stripe Customer: ${client.stripe_customer_id}\n`)

  // Fetch subscriptions with latest invoice expanded
  const stripeSubscriptions = await stripe.subscriptions.list({
    customer: client.stripe_customer_id,
    status: 'active',
    limit: 10,
    expand: ['data.latest_invoice'],
  })

  console.log(`Active subscriptions: ${stripeSubscriptions.data.length}`)

  if (stripeSubscriptions.data.length > 0) {
    const sub = stripeSubscriptions.data[0] as any

    console.log('\nbilling_cycle_anchor:', sub.billing_cycle_anchor)
    console.log('billing_cycle_anchor date:', sub.billing_cycle_anchor ? new Date(sub.billing_cycle_anchor * 1000).toISOString() : 'N/A')
    console.log('start_date:', sub.start_date)
    console.log('start_date date:', sub.start_date ? new Date(sub.start_date * 1000).toISOString() : 'N/A')
    console.log('created:', sub.created)
    console.log('created date:', sub.created ? new Date(sub.created * 1000).toISOString() : 'N/A')

    // Check latest invoice for period info
    const invoice = sub.latest_invoice
    if (invoice && typeof invoice !== 'string') {
      console.log('\nLatest invoice:')
      console.log('  period_start:', invoice.period_start, invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : 'N/A')
      console.log('  period_end:', invoice.period_end, invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : 'N/A')
    }

    // Check the upcoming invoice instead
    console.log('\nFetching upcoming invoice...')
    try {
      const upcoming = await stripe.invoices.retrieveUpcoming({
        customer: client.stripe_customer_id,
        subscription: sub.id,
      })
      console.log('Upcoming invoice:')
      console.log('  period_start:', upcoming.period_start, upcoming.period_start ? new Date(upcoming.period_start * 1000).toISOString() : 'N/A')
      console.log('  period_end:', upcoming.period_end, upcoming.period_end ? new Date(upcoming.period_end * 1000).toISOString() : 'N/A')
    } catch (e: any) {
      console.log('Error fetching upcoming invoice:', e.message)
    }
  }

  await prisma.$disconnect()
}

main().catch(console.error)
