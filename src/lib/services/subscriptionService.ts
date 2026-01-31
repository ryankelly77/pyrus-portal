import { prisma, dbPool } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import type Stripe from 'stripe'

interface ExpandedInvoice extends Stripe.Invoice {
  payment_intent?: Stripe.PaymentIntent | string | null
}

export interface SubscriptionDiscount {
  id: string
  couponCode: string | null
  couponName: string | null
  amountOff: number | null // in dollars
  percentOff: number | null
  duration: string // 'forever', 'once', 'repeating'
  appliesTo: string[] | null // product IDs if restricted, null if applies to all
}

export interface SubscriptionData {
  subscription: {
    id: string
    status: string
    currentPeriodStart: string | null
    currentPeriodEnd: string | null
    currentPeriodEndFormatted: string | null
    monthlyAmount: number // full price before discounts
    monthlyAmountAfterDiscount: number // actual amount charged
    totalDiscount: number // total discount applied
    createdAt: string | null
  } | null
  discounts: SubscriptionDiscount[]
  services: Array<{
    id: string
    name: string
    category: string | null
    price: number // full price before discounts
    discountedPrice: number // price after any discounts
    discountAmount: number // discount applied to this item
    quantity: number
    type: 'product' | 'bundle'
  }>
  paymentMethods: Array<{
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
  }>
  invoices: Array<{
    id: string
    number: string | null
    date: string
    amount: number
    status: string
    pdfUrl: string | null
    receiptUrl: string | null
    hostedUrl: string | null
  }>
  billingEmail: string | null
  clientName: string
  clientSince: string | null
}

// Format date in Central Time
function formatDate(date: Date | string | null): string | null {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Chicago',
  })
}

/**
 * Get subscription data for a client
 * Includes Stripe subscription, payment methods, invoices
 * Used by both client and admin routes for data parity
 */
export async function getSubscriptionData(clientId: string): Promise<SubscriptionData> {
  // Fetch client data
  const client = await prisma.clients.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      contact_email: true,
      stripe_customer_id: true,
      status: true,
      start_date: true,
    },
  })

  if (!client) {
    throw new Error('Client not found')
  }

  let services: SubscriptionData['services'] = []
  let subscriptionData: SubscriptionData['subscription'] = null
  let discounts: SubscriptionData['discounts'] = []
  let paymentMethods: SubscriptionData['paymentMethods'] = []
  let invoices: SubscriptionData['invoices'] = []
  let stripeBillingEmail: string | null = null

  // Try to fetch from Stripe if customer ID exists
  if (client.stripe_customer_id) {
    try {
      const stripeSubscriptions = await stripe.subscriptions.list({
        customer: client.stripe_customer_id,
        status: 'active',
        limit: 10,
        expand: ['data.latest_invoice', 'data.discounts', 'data.discounts.promotion_code'],
      })

      if (stripeSubscriptions.data.length > 0) {
        const stripeSub = stripeSubscriptions.data[0] as any

        // Collect all product IDs from subscription items
        const productIds = new Set<string>()
        for (const sub of stripeSubscriptions.data) {
          for (const item of sub.items.data) {
            const productId =
              typeof item.price.product === 'string'
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

        // Extract discount info from the subscription
        // Fetch coupon details for each discount
        const subDiscounts = (stripeSub.discounts || []) as any[]
        discounts = await Promise.all(
          subDiscounts.map(async (d: any) => {
            const couponId = d.source?.coupon || d.coupon
            const promoCodeObj = d.promotion_code

            // Fetch full coupon details if we only have an ID
            let couponData: any = null
            if (typeof couponId === 'string') {
              try {
                couponData = await stripe.coupons.retrieve(couponId)
              } catch {
                // Ignore errors fetching coupon
              }
            } else if (typeof couponId === 'object') {
              couponData = couponId
            }

            // Fetch promo code details if we have an ID
            let promoCode: string | null = null
            if (typeof promoCodeObj === 'string') {
              try {
                const promo = await stripe.promotionCodes.retrieve(promoCodeObj)
                promoCode = promo.code
              } catch {
                // Ignore errors
              }
            } else if (typeof promoCodeObj === 'object') {
              promoCode = promoCodeObj?.code || null
            }

            return {
              id: d.id,
              couponCode: promoCode,
              couponName: couponData?.name || couponId,
              amountOff: couponData?.amount_off ? couponData.amount_off / 100 : null,
              percentOff: couponData?.percent_off || null,
              duration: couponData?.duration || 'once',
              appliesTo: couponData?.applies_to?.products || null,
            }
          })
        )

        // Get period dates and discount amounts from latest invoice
        const latestInvoice = stripeSub.latest_invoice
        let periodStart: string | null = null
        let periodEnd: string | null = null
        let totalDiscountFromInvoice = 0
        let invoiceTotal = 0

        // Map of subscription item ID to discount amount from invoice
        const itemDiscountMap = new Map<string, number>()

        if (latestInvoice && typeof latestInvoice !== 'string') {
          periodStart = latestInvoice.period_start
            ? new Date(latestInvoice.period_start * 1000).toISOString()
            : null
          periodEnd = latestInvoice.period_end
            ? new Date(latestInvoice.period_end * 1000).toISOString()
            : null

          // Get actual total from invoice (already accounts for discounts)
          invoiceTotal = (latestInvoice.total || 0) / 100

          // Get discount amounts from invoice line items
          const invoiceLines = latestInvoice.lines?.data || []
          for (const line of invoiceLines) {
            const discountAmounts = (line as any).discount_amounts || []
            // Get subscription item ID from parent.subscription_item_details.subscription_item
            const subItemId = (line as any).parent?.subscription_item_details?.subscription_item
            let lineDiscount = 0

            for (const da of discountAmounts) {
              lineDiscount += (da.amount || 0) / 100
            }

            if (subItemId && lineDiscount > 0) {
              itemDiscountMap.set(subItemId, lineDiscount)
            }
            totalDiscountFromInvoice += lineDiscount
          }
        }

        // Fall back to billing_cycle_anchor if no invoice periods
        if (!periodStart && stripeSub.billing_cycle_anchor) {
          periodStart = new Date(stripeSub.billing_cycle_anchor * 1000).toISOString()
        }

        // Calculate total monthly amount from all active subscriptions
        let totalMonthlyAmount = 0
        let totalMonthlyAfterDiscount = 0
        const allServices: typeof services = []

        for (const sub of stripeSubscriptions.data) {
          for (const item of sub.items.data) {
            const price = item.price as any
            const productId =
              typeof price.product === 'string'
                ? price.product
                : (price.product as any)?.id || 'unknown'
            const productData = productMap.get(productId) || { name: 'Service', category: null }

            // Calculate monthly equivalent
            let monthlyPrice = (price.unit_amount || 0) / 100
            if (price.recurring?.interval === 'year') {
              monthlyPrice = monthlyPrice / 12
            }

            const itemTotal = monthlyPrice * (item.quantity || 1)
            const itemDiscount = itemDiscountMap.get(item.id) || 0
            const itemDiscountedTotal = itemTotal - itemDiscount

            totalMonthlyAmount += itemTotal
            totalMonthlyAfterDiscount += itemDiscountedTotal

            allServices.push({
              id: item.id,
              name: productData.name,
              category: productData.category,
              price: monthlyPrice,
              discountedPrice: monthlyPrice - (itemDiscount / (item.quantity || 1)),
              discountAmount: itemDiscount,
              quantity: item.quantity || 1,
              type: 'product',
            })
          }
        }

        services = allServices

        subscriptionData = {
          id: stripeSub.id,
          status: stripeSub.status,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          currentPeriodEndFormatted: formatDate(periodEnd),
          monthlyAmount: totalMonthlyAmount,
          monthlyAmountAfterDiscount: totalMonthlyAfterDiscount,
          totalDiscount: totalDiscountFromInvoice,
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
    const dbSubscription = await prisma.subscriptions.findFirst({
      where: {
        client_id: clientId,
        status: 'active',
      },
      orderBy: { created_at: 'desc' },
      include: {
        subscription_items: {
          include: {
            product: true,
            bundle: true,
          },
        },
      },
    })

    if (dbSubscription) {
      const dbMonthlyAmount = Number(dbSubscription.monthly_amount) || 0
      subscriptionData = {
        id: dbSubscription.id,
        status: dbSubscription.status || 'active',
        currentPeriodStart: dbSubscription.current_period_start?.toISOString() || null,
        currentPeriodEnd: dbSubscription.current_period_end?.toISOString() || null,
        currentPeriodEndFormatted: formatDate(dbSubscription.current_period_end),
        monthlyAmount: dbMonthlyAmount,
        monthlyAmountAfterDiscount: dbMonthlyAmount, // No discounts from DB
        totalDiscount: 0,
        createdAt: dbSubscription.created_at?.toISOString() || null,
      }

      services = dbSubscription.subscription_items.map((item) => {
        const itemPrice = Number(item.unit_amount) || 0
        return {
          id: item.id,
          name: item.product?.name || item.bundle?.name || 'Unknown Service',
          category: item.product?.category || null,
          price: itemPrice,
          discountedPrice: itemPrice, // No discounts from DB
          discountAmount: 0,
          quantity: item.quantity || 1,
          type: item.bundle_id ? 'bundle' : 'product',
        }
      })
    }
  }

  // Fetch payment methods and invoices from Stripe if customer exists
  if (client.stripe_customer_id) {
    try {
      // Fetch ALL payment methods
      const stripePaymentMethods = await stripe.customers.listPaymentMethods(
        client.stripe_customer_id
      )

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

      // Fetch all paid invoices
      const stripeInvoices = await stripe.invoices.list({
        customer: client.stripe_customer_id,
        limit: 100, // Increased to show all invoices
        status: 'paid',
        expand: ['data.payment_intent.latest_charge'],
      })

      invoices = await Promise.all(
        stripeInvoices.data.map(async (invoice) => {
          const inv = invoice as ExpandedInvoice
          let receiptUrl: string | null = null

          if (
            inv.payment_intent &&
            typeof inv.payment_intent !== 'string' &&
            inv.payment_intent.latest_charge &&
            typeof inv.payment_intent.latest_charge !== 'string'
          ) {
            receiptUrl = inv.payment_intent.latest_charge.receipt_url ?? null
          }

          return {
            id: inv.id,
            number: inv.number,
            date: new Date(inv.created * 1000).toISOString(),
            amount: inv.amount_paid / 100,
            status: inv.status || 'unknown',
            pdfUrl: inv.invoice_pdf || null,
            receiptUrl,
            hostedUrl: inv.hosted_invoice_url || null,
          }
        })
      )
    } catch (stripeError) {
      console.error('Error fetching Stripe data:', stripeError)
      // Continue without Stripe data
    }
  }

  return {
    subscription: subscriptionData,
    discounts,
    services,
    paymentMethods,
    invoices,
    billingEmail: stripeBillingEmail || client.contact_email,
    clientName: client.name,
    clientSince: formatDate(client.start_date),
  }
}
