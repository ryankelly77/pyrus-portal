import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { logCheckoutError } from '@/lib/alerts'

export const dynamic = 'force-dynamic'

// GET - Get SetupIntent client secret for adding a new payment method
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let clientId = searchParams.get('clientId')

    // If no clientId provided, get the current user's client
    if (!clientId) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }

      const profileResult = await dbPool.query(
        `SELECT client_id FROM profiles WHERE id = $1`,
        [user.id]
      )

      const profileClientId = profileResult.rows[0]?.client_id

      if (!profileClientId) {
        return NextResponse.json({ error: 'No client associated with user' }, { status: 404 })
      }

      clientId = profileClientId
    }

    // Get client with stripe_customer_id
    const clientResult = await dbPool.query(
      `SELECT id, name, contact_email, stripe_customer_id FROM clients WHERE id = $1`,
      [clientId]
    )

    if (clientResult.rows.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const client = clientResult.rows[0]
    let stripeCustomerId = client.stripe_customer_id

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: client.contact_email || undefined,
        name: client.name,
        metadata: { pyrus_client_id: client.id },
      })
      stripeCustomerId = customer.id

      await dbPool.query(
        `UPDATE clients SET stripe_customer_id = $1 WHERE id = $2`,
        [stripeCustomerId, clientId]
      )
    }

    // Create SetupIntent for adding payment method
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      automatic_payment_methods: { enabled: true },
      metadata: { clientId: clientId },
    })

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: stripeCustomerId,
    })
  } catch (error: any) {
    console.error('Error creating SetupIntent:', error)
    logCheckoutError(
      `SetupIntent creation failed: ${error.message || 'Unknown error'}`,
      undefined,
      { step: 'create_setup_intent', error: error.message },
      'client/payment-method/route.ts'
    )
    return NextResponse.json({ error: 'Failed to initialize payment form' }, { status: 500 })
  }
}

// POST - Set payment method as default after successful setup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId: bodyClientId, paymentMethodId } = body

    let clientId = bodyClientId

    // If no clientId provided, get the current user's client
    if (!clientId) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }

      const profileResult = await dbPool.query(
        `SELECT client_id FROM profiles WHERE id = $1`,
        [user.id]
      )

      clientId = profileResult.rows[0]?.client_id

      if (!clientId) {
        return NextResponse.json({ error: 'No client associated with user' }, { status: 404 })
      }
    }

    if (!paymentMethodId) {
      return NextResponse.json({ error: 'Payment method ID is required' }, { status: 400 })
    }

    // Get client with stripe_customer_id
    const clientResult = await dbPool.query(
      `SELECT stripe_customer_id FROM clients WHERE id = $1`,
      [clientId]
    )

    if (clientResult.rows.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const stripeCustomerId = clientResult.rows[0].stripe_customer_id

    if (!stripeCustomerId) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 })
    }

    // Attach payment method to customer (in case it's not already attached)
    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomerId,
      })
    } catch (attachError: any) {
      // Ignore if already attached
      if (attachError.code !== 'resource_already_exists') {
        throw attachError
      }
    }

    // Set as default payment method
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })

    // Update any active subscriptions to use the new payment method
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
    })

    for (const subscription of subscriptions.data) {
      await stripe.subscriptions.update(subscription.id, {
        default_payment_method: paymentMethodId,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating payment method:', error)
    logCheckoutError(
      `Payment method update failed: ${error.message || 'Unknown error'}`,
      undefined,
      { step: 'update_payment_method', error: error.message },
      'client/payment-method/route.ts'
    )
    return NextResponse.json({ error: 'Failed to update payment method' }, { status: 500 })
  }
}
