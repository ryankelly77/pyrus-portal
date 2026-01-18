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

    // Fetch subscription items with product/bundle details
    let services: Array<{
      id: string
      name: string
      category: string | null
      price: number
      quantity: number
      type: 'product' | 'bundle'
    }> = []

    // Subscription data - try Stripe first, then fall back to database
    let subscriptionData: {
      id: string
      status: string
      currentPeriodStart: string | null
      currentPeriodEnd: string | null
      monthlyAmount: number
      createdAt: string | null
    } | null = null

    // Try to fetch from Stripe if customer ID exists
    if (client.stripe_customer_id) {
      try {
        const stripeSubscriptions = await stripe.subscriptions.list({
          customer: client.stripe_customer_id,
          status: 'active',
          limit: 10,
          expand: ['data.latest_invoice'],
        })

        if (stripeSubscriptions.data.length > 0) {
          // Use the most recent subscription
          const stripeSub = stripeSubscriptions.data[0] as any

          // Collect all product IDs from subscription items
          const productIds = new Set<string>()
          for (const sub of stripeSubscriptions.data) {
            for (const item of sub.items.data) {
              const productId = typeof item.price.product === 'string'
                ? item.price.product
                : (item.price.product as any)?.id
              if (productId) productIds.add(productId)
            }
          }

          // Fetch product details
          const productMap = new Map<string, { name: string; category: string | null }>()
          await Promise.all(
            Array.from(productIds).map(async (id) => {
              try {
                const product = await stripe.products.retrieve(id)
                productMap.set(id, {
                  name: product.name,
                  category: product.metadata?.category || null,
                })
              } catch {
                productMap.set(id, { name: 'Service', category: null })
              }
            })
          )

          // Calculate total monthly amount from all active subscriptions
          let totalMonthlyAmount = 0
          const allServices: typeof services = []

          for (const sub of stripeSubscriptions.data) {
            for (const item of sub.items.data) {
              const price = item.price as any
              const productId = typeof price.product === 'string'
                ? price.product
                : (price.product as any)?.id || 'unknown'
              const productData = productMap.get(productId) || { name: 'Service', category: null }

              // Calculate monthly equivalent
              let monthlyPrice = (price.unit_amount || 0) / 100
              if (price.recurring?.interval === 'year') {
                monthlyPrice = monthlyPrice / 12
              }

              totalMonthlyAmount += monthlyPrice * (item.quantity || 1)

              allServices.push({
                id: item.id,
                name: productData.name,
                category: productData.category,
                price: monthlyPrice,
                quantity: item.quantity || 1,
                type: 'product',
              })
            }
          }

          services = allServices

          // Get period dates from latest invoice (more reliable than subscription object in newer Stripe API)
          const latestInvoice = stripeSub.latest_invoice
          let periodStart: string | null = null
          let periodEnd: string | null = null

          if (latestInvoice && typeof latestInvoice !== 'string') {
            periodStart = latestInvoice.period_start
              ? new Date(latestInvoice.period_start * 1000).toISOString()
              : null
            periodEnd = latestInvoice.period_end
              ? new Date(latestInvoice.period_end * 1000).toISOString()
              : null
          }

          // Fall back to billing_cycle_anchor if no invoice periods
          if (!periodStart && stripeSub.billing_cycle_anchor) {
            periodStart = new Date(stripeSub.billing_cycle_anchor * 1000).toISOString()
          }

          subscriptionData = {
            id: stripeSub.id,
            status: stripeSub.status,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            monthlyAmount: totalMonthlyAmount,
            createdAt: new Date(stripeSub.created * 1000).toISOString(),
          }
        }
      } catch (stripeError) {
        console.error('Error fetching Stripe subscription:', stripeError)
        // Fall through to database fetch
      }
    }

    // Fall back to database if no Stripe data
    if (!subscriptionData) {
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

      if (subscriptionResult.rows.length > 0) {
        const dbSub = subscriptionResult.rows[0]
        subscriptionData = {
          id: dbSub.id,
          status: dbSub.status,
          currentPeriodStart: dbSub.current_period_start,
          currentPeriodEnd: dbSub.current_period_end,
          monthlyAmount: parseFloat(dbSub.monthly_amount) || 0,
          createdAt: dbSub.created_at,
        }

        // Fetch services from database
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
          [dbSub.id]
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
    }

    // Fetch payment methods and invoices from Stripe if customer exists
    let paymentMethods: Array<{
      id: string
      type: string
      brand: string
      last4: string
      expMonth: number
      expYear: number
      bankName?: string
      accountType?: string
      linkEmail?: string
      isDefault: boolean
    }> = []

    let invoices: Array<{
      id: string
      number: string | null
      date: string
      amount: number
      status: string
      pdfUrl: string | null
      receiptUrl: string | null
      hostedUrl: string | null
    }> = []

    let stripeBillingEmail: string | null = null

    if (client.stripe_customer_id) {
      try {
        // Fetch ALL payment methods (not just cards)
        const stripePaymentMethods = await stripe.customers.listPaymentMethods(client.stripe_customer_id)

        // Get default payment method and billing email
        const stripeCustomer = await stripe.customers.retrieve(client.stripe_customer_id)
        const defaultPaymentMethodId = (stripeCustomer as any).invoice_settings?.default_payment_method
        stripeBillingEmail = (stripeCustomer as any).email || null

        paymentMethods = stripePaymentMethods.data.map((pm) => ({
          id: pm.id,
          type: pm.type,
          brand: pm.card?.brand || (pm.us_bank_account ? 'bank' : pm.type),
          last4: pm.card?.last4 || pm.us_bank_account?.last4 || '****',
          expMonth: pm.card?.exp_month || 0,
          expYear: pm.card?.exp_year || 0,
          bankName: pm.us_bank_account?.bank_name || undefined,
          accountType: pm.us_bank_account?.account_type || undefined,
          linkEmail: pm.link?.email || undefined,
          isDefault: pm.id === defaultPaymentMethodId,
        }))

        // Fetch invoices (last 10) - only paid invoices (receipts)
        const stripeInvoices = await stripe.invoices.list({
          customer: client.stripe_customer_id,
          limit: 10,
          status: 'paid', // Only show paid invoices (receipts)
        })

        // Get receipt URLs from charges for paid invoices
        invoices = await Promise.all(
          stripeInvoices.data.map(async (inv) => {
            let receiptUrl: string | null = null

            // Try to get receipt URL from the charge
            if (inv.charge) {
              try {
                const chargeId = typeof inv.charge === 'string' ? inv.charge : inv.charge.id
                const charge = await stripe.charges.retrieve(chargeId)
                receiptUrl = charge.receipt_url || null
              } catch {
                // Fall back to invoice PDF
              }
            }

            return {
              id: inv.id,
              number: inv.number,
              date: new Date(inv.created * 1000).toISOString(),
              amount: inv.amount_paid / 100, // Convert from cents
              status: inv.status || 'unknown',
              pdfUrl: inv.invoice_pdf || null,
              receiptUrl, // Receipt from the charge
              hostedUrl: inv.hosted_invoice_url || null, // Hosted page showing paid status
            }
          })
        )
      } catch (stripeError) {
        console.error('Error fetching Stripe data:', stripeError)
        // Continue without Stripe data
      }
    }

    // Format dates in Central Time (Fort Worth, TX)
    const formatDate = (date: Date | string | null) => {
      if (!date) return null
      return new Date(date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'America/Chicago'
      })
    }

    return NextResponse.json({
      subscription: subscriptionData ? {
        ...subscriptionData,
        currentPeriodEndFormatted: formatDate(subscriptionData.currentPeriodEnd),
      } : null,
      services,
      paymentMethods,
      invoices,
      billingEmail: stripeBillingEmail || client.contact_email,
      clientName: client.name,
      clientSince: formatDate(client.start_date),
    })
  } catch (error) {
    console.error('Error fetching subscription data:', error)
    return NextResponse.json({ error: 'Failed to fetch subscription data' }, { status: 500 })
  }
}
