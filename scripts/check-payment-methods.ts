import { stripe } from '../src/lib/stripe'
import { prisma } from '../src/lib/prisma'

async function main() {
  // Check a specific payment method
  const pmId = 'pm_1SDTZoG6lmzQA2EM5KyEv9vJ'

  console.log(`\nChecking payment method: ${pmId}\n`)

  try {
    const pm = await stripe.paymentMethods.retrieve(pmId)
    console.log('Payment Method Details:')
    console.log(`  ID: ${pm.id}`)
    console.log(`  Type: ${pm.type}`)
    console.log(`  Customer: ${pm.customer}`)
    console.log(`  Created: ${new Date(pm.created * 1000).toISOString()}`)

    if (pm.card) {
      console.log(`  Card Brand: ${pm.card.brand}`)
      console.log(`  Card Last4: ${pm.card.last4}`)
      console.log(`  Exp: ${pm.card.exp_month}/${pm.card.exp_year}`)
    }

    if (pm.link) {
      console.log(`  Link email: ${pm.link.email}`)
    }

    console.log('\nFull object:')
    console.log(JSON.stringify(pm, null, 2))
  } catch (e: any) {
    console.log(`Error: ${e.message}`)
  }

  // Now list ALL payment method types for Espronceda Law
  const customerId = 'cus_SdL1zPsQaMXAE3'
  console.log(`\n\nListing all payment methods for customer ${customerId}:\n`)

  // List without type filter to see all
  const allPMs = await stripe.customers.listPaymentMethods(customerId)
  console.log(`Total payment methods: ${allPMs.data.length}`)

  for (const pm of allPMs.data) {
    console.log(`\n  ${pm.id}:`)
    console.log(`    Type: ${pm.type}`)
    if (pm.card) {
      console.log(`    Card: ${pm.card.brand} ****${pm.card.last4}`)
    }
    if (pm.link) {
      console.log(`    Link: ${pm.link.email}`)
    }
  }

  await prisma.$disconnect()
}

main().catch(console.error)
