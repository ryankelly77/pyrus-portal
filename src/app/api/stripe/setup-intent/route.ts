import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

// Check for Stripe secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY
if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY is not configured')
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      console.error('Stripe is not initialized - STRIPE_SECRET_KEY missing')
      return NextResponse.json(
        { error: 'Payment system not configured. Please contact support.' },
        { status: 503 }
      )
    }

    const { clientId, email, name, billingCycle } = await request.json()
    console.log('[SetupIntent] Request:', { clientId, email, name, billingCycle })

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
    }

    // Get or create Stripe customer for this client
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      console.error('[SetupIntent] Client not found:', clientId)
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    console.log('[SetupIntent] Found client:', client.name, 'Stripe ID:', client.stripe_customer_id)

    let stripeCustomerId = client.stripe_customer_id

    if (!stripeCustomerId) {
      console.log('[SetupIntent] Creating new Stripe customer...')
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: email || client.contact_email || undefined,
        name: name || client.name,
        metadata: {
          clientId: clientId,
        },
      })
      stripeCustomerId = customer.id
      console.log('[SetupIntent] Created Stripe customer:', stripeCustomerId)

      // Save the Stripe customer ID to the client record
      await prisma.clients.update({
        where: { id: clientId },
        data: { stripe_customer_id: stripeCustomerId },
      })
    }

    // Create a SetupIntent to collect payment method
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

    console.log('[SetupIntent] Creating SetupIntent for customer:', stripeCustomerId)
    const setupIntent = await stripe.setupIntents.create(setupIntentParams)
    console.log('[SetupIntent] Created:', setupIntent.id)

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: stripeCustomerId,
    })
  } catch (error) {
    // Log the full error for debugging
    console.error('[SetupIntent] Error:', error)

    // Return more specific error messages
    if (error instanceof Stripe.errors.StripeError) {
      console.error('[SetupIntent] Stripe error type:', error.type, 'message:', error.message)
      return NextResponse.json(
        { error: `Stripe error: ${error.message}` },
        { status: error.statusCode || 500 }
      )
    }

    // Generic error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to initialize payment: ${errorMessage}` },
      { status: 500 }
    )
  }
}
