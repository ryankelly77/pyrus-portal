import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { clientId, email, name, billingCycle } = await request.json()

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
    }

    // Get or create Stripe customer for this client
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    let stripeCustomerId = client.stripe_customer_id

    if (!stripeCustomerId) {
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: email || client.contact_email || undefined,
        name: name || client.name,
        metadata: {
          clientId: clientId,
        },
      })
      stripeCustomerId = customer.id

      // Save the Stripe customer ID to the client record
      await prisma.clients.update({
        where: { id: clientId },
        data: { stripe_customer_id: stripeCustomerId },
      })
    }

    // Create a SetupIntent to collect payment method
    // For annual billing, prefer ACH; for monthly, prefer card
    const setupIntentParams: Stripe.SetupIntentCreateParams = {
      customer: stripeCustomerId,
      metadata: {
        clientId: clientId,
        billingCycle: billingCycle || 'monthly',
      },
      // Use automatic payment methods - Stripe will show methods enabled in dashboard
      automatic_payment_methods: {
        enabled: true,
      },
    }

    console.log('Creating SetupIntent with params:', JSON.stringify(setupIntentParams, null, 2))
    const setupIntent = await stripe.setupIntents.create(setupIntentParams)
    console.log('SetupIntent created:', setupIntent.id)

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: stripeCustomerId,
    })
  } catch (error) {
    console.error('Failed to create SetupIntent:', error)
    return NextResponse.json(
      { error: 'Failed to initialize payment' },
      { status: 500 }
    )
  }
}
