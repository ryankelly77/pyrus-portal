import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// POST /api/admin/subscriptions/fix-backfill
// Pulls actual invoices from Stripe and creates accurate activity entries
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    if (auth.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can run this' }, { status: 403 })
    }

    const results = {
      deletedBackfillEntries: 0,
      invoicesProcessed: 0,
      activitiesCreated: 0,
      clientsNotFound: [] as string[],
      errors: [] as string[],
    }

    // Delete all existing backfilled activity entries
    const deleteResult = await prisma.activity_log.deleteMany({
      where: {
        activity_type: { in: ['purchase', 'payment'] },
        metadata: {
          path: ['backfilled'],
          equals: true
        }
      }
    })
    results.deletedBackfillEntries = deleteResult.count

    // Get all paid invoices from Stripe for last 60 days
    const sixtyDaysAgo = Math.floor((Date.now() - 60 * 24 * 60 * 60 * 1000) / 1000)

    const invoices = await stripe.invoices.list({
      created: { gte: sixtyDaysAgo },
      status: 'paid',
      limit: 100,
    })

    // Build a map of stripe customer IDs to client IDs
    const clients = await prisma.clients.findMany({
      where: { stripe_customer_id: { not: null } },
      select: { id: true, name: true, stripe_customer_id: true }
    })

    const customerToClient = new Map<string, { id: string; name: string }>()
    for (const client of clients) {
      if (client.stripe_customer_id) {
        customerToClient.set(client.stripe_customer_id, { id: client.id, name: client.name })
      }
    }

    // Process each invoice
    for (const invoice of invoices.data) {
      results.invoicesProcessed++

      const customerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id

      if (!customerId) continue

      const client = customerToClient.get(customerId)
      if (!client) {
        // Try to get customer email and find client that way
        const stripeCustomer = await stripe.customers.retrieve(customerId)
        if ('email' in stripeCustomer && stripeCustomer.email) {
          const clientByEmail = await prisma.clients.findFirst({
            where: { contact_email: stripeCustomer.email },
            select: { id: true, name: true }
          })
          if (clientByEmail) {
            customerToClient.set(customerId, clientByEmail)
          } else {
            results.clientsNotFound.push(`${stripeCustomer.email} (${customerId})`)
            continue
          }
        } else {
          continue
        }
      }

      const matchedClient = customerToClient.get(customerId)
      if (!matchedClient) continue

      try {
        const amountPaid = invoice.amount_paid / 100
        const invoiceDate = invoice.created ? new Date(invoice.created * 1000) : new Date()

        // Determine the description based on what was charged
        let description: string

        if (amountPaid === 0) {
          // $0 invoice - trial, coupon, or deferred billing
          if (invoice.billing_reason === 'subscription_create') {
            description = 'New subscription started'
          } else {
            description = 'Invoice processed ($0)'
          }
        } else if (invoice.billing_reason === 'subscription_create') {
          description = `New subscription - $${amountPaid.toFixed(2)} charged`
        } else if (invoice.billing_reason === 'subscription_cycle') {
          description = `Recurring payment - $${amountPaid.toFixed(2)}`
        } else if (invoice.billing_reason === 'subscription_update') {
          description = `Subscription updated - $${amountPaid.toFixed(2)} charged`
        } else {
          description = `Payment received - $${amountPaid.toFixed(2)}`
        }

        // Check if we already have an activity for this invoice
        const existingActivity = await prisma.activity_log.findFirst({
          where: {
            client_id: matchedClient.id,
            activity_type: { in: ['purchase', 'payment'] },
            metadata: {
              path: ['invoiceId'],
              equals: invoice.id
            }
          }
        })

        if (!existingActivity) {
          await prisma.activity_log.create({
            data: {
              client_id: matchedClient.id,
              activity_type: amountPaid > 0 ? 'purchase' : 'payment',
              description,
              metadata: {
                invoiceId: invoice.id,
                amount: amountPaid,
                billingReason: invoice.billing_reason,
                subscriptionId: (invoice as any).subscription,
                backfilled: true,
              },
              created_at: invoiceDate,
            }
          })
          results.activitiesCreated++
        }

      } catch (invoiceError) {
        const msg = invoiceError instanceof Error ? invoiceError.message : String(invoiceError)
        results.errors.push(`Invoice ${invoice.id}: ${msg}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Backfill from invoices completed',
      results
    })

  } catch (error) {
    console.error('Fix backfill error:', error)
    return NextResponse.json({ error: 'Failed to fix backfill' }, { status: 500 })
  }
}

// DELETE - just remove all backfilled entries without recreating
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    if (auth.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can run this' }, { status: 403 })
    }

    const deleteResult = await prisma.activity_log.deleteMany({
      where: {
        activity_type: { in: ['purchase', 'payment'] },
        metadata: {
          path: ['backfilled'],
          equals: true
        }
      }
    })

    return NextResponse.json({
      success: true,
      deleted: deleteResult.count
    })

  } catch (error) {
    console.error('Delete backfill error:', error)
    return NextResponse.json({ error: 'Failed to delete backfill entries' }, { status: 500 })
  }
}
