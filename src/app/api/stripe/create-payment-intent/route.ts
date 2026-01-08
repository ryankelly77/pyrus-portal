// @ts-nocheck - Stripe and Supabase types may not perfectly align
import { NextRequest, NextResponse } from 'next/server'
import { stripe, getOrCreateCoupon, COUPON_CODES } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

interface CartItem {
  id: string
  name: string
  quantity: number
  monthlyPrice: number
  onetimePrice: number
  pricingType: 'monthly' | 'onetime'
  category?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, items, couponCode, amount: customAmount } = body as {
      clientId: string
      items: CartItem[]
      couponCode?: string
      amount?: number // Custom amount in cents (optional)
    }

    if (!clientId || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Client ID and items are required' },
        { status: 400 }
      )
    }

    // Get client from database
    const supabase = await createClient()
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientData = client as any

    // Create or retrieve Stripe customer
    let stripeCustomerId = clientData.stripe_customer_id as string | null

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: clientData.name,
        email: clientData.contact_email || undefined,
        metadata: {
          pyrus_client_id: clientData.id,
        },
      })
      stripeCustomerId = customer.id

      // Save Stripe customer ID to database - use raw query to bypass type checking
      await supabase.rpc('update_client_stripe_id', {
        p_client_id: clientId,
        p_stripe_customer_id: stripeCustomerId,
      }).catch(() => {
        // Fallback to direct update if RPC doesn't exist
        return supabase
          .from('clients')
          .update({ stripe_customer_id: stripeCustomerId } as Record<string, string>)
          .eq('id', clientId)
      })
    }

    // Calculate total amount (in cents)
    let amount = 0
    const itemDescriptions: string[] = []

    // Use custom amount if provided, otherwise calculate from items
    if (customAmount && customAmount > 0) {
      amount = customAmount
      for (const item of items) {
        itemDescriptions.push(`${item.name} x${item.quantity}`)
      }
    } else {
      // Only count one-time items for PaymentIntent
      // Monthly items should go through subscription endpoint
      for (const item of items) {
        if (item.pricingType === 'onetime' && item.onetimePrice > 0) {
          amount += item.onetimePrice * item.quantity * 100 // Convert to cents
          itemDescriptions.push(`${item.name} x${item.quantity}`)
        }
      }

      if (amount === 0) {
        return NextResponse.json(
          { error: 'No one-time items in cart. Use subscription endpoint for monthly items.' },
          { status: 400 }
        )
      }
    }

    // Apply coupon discount if valid
    let discountPercent = 0
    if (couponCode) {
      discountPercent = COUPON_CODES[couponCode.toUpperCase()] || 0
      if (discountPercent > 0) {
        amount = Math.round(amount * (1 - discountPercent / 100))
      }
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      customer: stripeCustomerId,
      description: `One-time purchase: ${itemDescriptions.join(', ')}`,
      metadata: {
        pyrus_client_id: clientId,
        items: JSON.stringify(items.map(i => ({ id: i.id, name: i.name, qty: i.quantity }))),
        coupon_code: couponCode || '',
        discount_percent: discountPercent.toString(),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    })
  } catch (error) {
    console.error('Error creating payment intent:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
