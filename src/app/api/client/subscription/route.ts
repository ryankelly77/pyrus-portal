import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

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

      // Get profile with client_id
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

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!clientId || !uuidRegex.test(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID format' }, { status: 400 })
    }

    // Fetch client data including stripe_customer_id
    const clientResult = await dbPool.query(
      `SELECT id, name, contact_email, stripe_customer_id, status, start_date
       FROM clients WHERE id = $1`,
      [clientId]
    )

    if (clientResult.rows.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const client = clientResult.rows[0]

    // Fetch active subscription from database
    const subscriptionResult = await dbPool.query(
      `SELECT
        s.id,
        s.stripe_subscription_id,
        s.status,
        s.current_period_start,
        s.current_period_end,
        s.monthly_amount,
        s.created_at
       FROM subscriptions s
       WHERE s.client_id = $1 AND s.status = 'active'
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [clientId]
    )

    // Fetch subscription items with product/bundle details
    let services: Array<{
      id: string
      name: string
      category: string | null
      price: number
      quantity: number
      type: 'product' | 'bundle'
    }> = []

    if (subscriptionResult.rows.length > 0) {
      const subscription = subscriptionResult.rows[0]

      const itemsResult = await dbPool.query(
        `SELECT
          si.id,
          si.quantity,
          si.unit_amount,
          p.id as product_id,
          p.name as product_name,
          p.category as product_category,
          b.id as bundle_id,
          b.name as bundle_name
         FROM subscription_items si
         LEFT JOIN products p ON p.id = si.product_id
         LEFT JOIN bundles b ON b.id = si.bundle_id
         WHERE si.subscription_id = $1`,
        [subscription.id]
      )

      services = itemsResult.rows.map((item: any) => ({
        id: item.id,
        name: item.product_name || item.bundle_name || 'Unknown Service',
        category: item.product_category || null,
        price: parseFloat(item.unit_amount) || 0,
        quantity: item.quantity || 1,
        type: item.bundle_id ? 'bundle' : 'product',
      }))
    }

    // Fetch payment methods and invoices from Stripe if customer exists
    let paymentMethods: Array<{
      id: string
      brand: string
      last4: string
      expMonth: number
      expYear: number
      isDefault: boolean
    }> = []

    let invoices: Array<{
      id: string
      number: string | null
      date: string
      amount: number
      status: string
      pdfUrl: string | null
    }> = []

    if (client.stripe_customer_id) {
      try {
        // Fetch payment methods
        const stripePaymentMethods = await stripe.paymentMethods.list({
          customer: client.stripe_customer_id,
          type: 'card',
        })

        // Get default payment method
        const stripeCustomer = await stripe.customers.retrieve(client.stripe_customer_id)
        const defaultPaymentMethodId = (stripeCustomer as any).invoice_settings?.default_payment_method

        paymentMethods = stripePaymentMethods.data.map((pm) => ({
          id: pm.id,
          brand: pm.card?.brand || 'card',
          last4: pm.card?.last4 || '****',
          expMonth: pm.card?.exp_month || 0,
          expYear: pm.card?.exp_year || 0,
          isDefault: pm.id === defaultPaymentMethodId,
        }))

        // Fetch invoices (last 10)
        const stripeInvoices = await stripe.invoices.list({
          customer: client.stripe_customer_id,
          limit: 10,
        })

        invoices = stripeInvoices.data.map((inv) => ({
          id: inv.id,
          number: inv.number,
          date: new Date(inv.created * 1000).toISOString(),
          amount: inv.amount_paid / 100, // Convert from cents
          status: inv.status || 'unknown',
          pdfUrl: inv.invoice_pdf || null,
        }))
      } catch (stripeError) {
        console.error('Error fetching Stripe data:', stripeError)
        // Continue without Stripe data
      }
    }

    // Build subscription response
    const subscription = subscriptionResult.rows.length > 0
      ? {
          id: subscriptionResult.rows[0].id,
          status: subscriptionResult.rows[0].status,
          currentPeriodStart: subscriptionResult.rows[0].current_period_start,
          currentPeriodEnd: subscriptionResult.rows[0].current_period_end,
          monthlyAmount: parseFloat(subscriptionResult.rows[0].monthly_amount) || 0,
          createdAt: subscriptionResult.rows[0].created_at,
        }
      : null

    return NextResponse.json({
      subscription,
      services,
      paymentMethods,
      invoices,
      billingEmail: client.contact_email,
      clientName: client.name,
      clientSince: client.start_date
        ? new Date(client.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : null,
    })
  } catch (error) {
    console.error('Error fetching subscription data:', error)
    return NextResponse.json({ error: 'Failed to fetch subscription data' }, { status: 500 })
  }
}
