// @ts-nocheck - Stripe and Supabase types may not perfectly align
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

// Disable body parsing, we need raw body for webhook verification
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  const supabase = await createServiceClient()

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const clientId = paymentIntent.metadata?.pyrus_client_id

        console.log(`Payment succeeded for client ${clientId}:`, paymentIntent.id)

        // Record payment in database if needed
        // This is for one-time payments not associated with subscriptions
        break
      }

      case 'customer.subscription.created': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = event.data.object as any
        const clientId = subscription.metadata?.pyrus_client_id
        const recommendationId = subscription.metadata?.recommendation_id

        console.log(`Subscription created for client ${clientId}:`, subscription.id)

        // Update or create subscription record
        if (clientId) {
          const { data: upsertedSub, error } = await supabase
            .from('subscriptions')
            .upsert({
              stripe_subscription_id: subscription.id,
              client_id: clientId,
              recommendation_id: recommendationId || null,
              stripe_customer_id: subscription.customer as string,
              status: subscription.status,
              current_period_start: subscription.current_period_start
                ? new Date(subscription.current_period_start * 1000).toISOString()
                : null,
              current_period_end: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null,
            } as Record<string, unknown>, {
              onConflict: 'stripe_subscription_id',
            })
            .select()
            .single()

          if (error) {
            console.error('Failed to upsert subscription:', error)
          } else if (upsertedSub) {
            // Log subscription history
            await prisma.subscription_history.create({
              data: {
                subscription_id: upsertedSub.id,
                action: 'created',
                details: 'Subscription initiated',
              }
            })
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = event.data.object as any

        console.log(`Subscription updated:`, subscription.id, subscription.status)

        // Update subscription status
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: subscription.current_period_start
              ? new Date(subscription.current_period_start * 1000).toISOString()
              : null,
            current_period_end: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
            canceled_at: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000).toISOString()
              : null,
          } as Record<string, unknown>)
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('Failed to update subscription:', error)
        }

        // If subscription became active, update recommendation status and capture purchase info
        if (subscription.status === 'active') {
          const recommendationId = subscription.metadata?.recommendation_id
          const selectedTier = subscription.metadata?.selected_tier
          const purchasedAt = new Date()

          // Get the subscription record to add history
          const { data: subRecord } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('stripe_subscription_id', subscription.id)
            .single()

          if (subRecord) {
            // Log subscription activated
            await prisma.subscription_history.create({
              data: {
                subscription_id: subRecord.id,
                action: 'activated',
                details: selectedTier
                  ? `Subscription activated with ${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} plan`
                  : 'Subscription activated',
              }
            })
          }

          if (recommendationId) {
            // Update recommendation with status, purchased tier and timestamp
            await prisma.recommendations.update({
              where: { id: recommendationId },
              data: {
                status: 'accepted',
                purchased_tier: selectedTier || null,
                purchased_at: purchasedAt,
              }
            })

            // Add history entry for purchase
            await prisma.recommendation_history.create({
              data: {
                recommendation_id: recommendationId,
                action: 'purchased',
                details: selectedTier
                  ? `Client purchased the ${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} plan`
                  : 'Client completed purchase',
              }
            })

            console.log(`Recommendation ${recommendationId} marked as purchased (tier: ${selectedTier})`)
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = event.data.object as any

        console.log(`Subscription canceled:`, subscription.id)

        // Get the subscription record to add history
        const { data: canceledSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .single()

        if (canceledSub) {
          // Log subscription canceled
          await prisma.subscription_history.create({
            data: {
              subscription_id: canceledSub.id,
              action: 'canceled',
              details: 'Subscription canceled',
            }
          })
        }

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          } as Record<string, unknown>)
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('Failed to update canceled subscription:', error)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any

        console.log(`Invoice paid:`, invoice.id, `Amount: $${(invoice.amount_paid / 100).toFixed(2)}`)

        // Record revenue if this is a subscription invoice
        if (invoice.subscription) {
          const { data: subscriptionRecord } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('stripe_subscription_id', invoice.subscription as string)
            .single()

          if (subscriptionRecord) {
            // Add revenue to monthly revenue records
            const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
            const amount = invoice.amount_paid / 100
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rec = subscriptionRecord as any

            await supabase
              .from('revenue_records')
              .upsert({
                client_id: rec.client_id,
                month: currentMonth,
                mrr: amount,
                change_type: invoice.billing_reason === 'subscription_create' ? 'new' : 'recurring',
                change_amount: amount,
              } as Record<string, unknown>, {
                onConflict: 'client_id,month',
              })
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any

        console.log(`Invoice payment failed:`, invoice.id)

        // Update subscription status if applicable
        if (invoice.subscription) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due' } as Record<string, unknown>)
            .eq('stripe_subscription_id', invoice.subscription as string)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
