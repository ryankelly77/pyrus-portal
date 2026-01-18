import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { requireAdmin } from '@/lib/auth/requireAdmin'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/clients/[id]/invoices - Get all invoices for a client from Stripe
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin()
    if ((auth as any)?.user === undefined) return auth as any
    const { id: clientId } = await params

    // Get client to find stripe_customer_id
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        stripe_customer_id: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (!client.stripe_customer_id) {
      return NextResponse.json({
        invoices: [],
        customer: null,
        message: 'No Stripe customer ID linked to this client',
      })
    }

    // Fetch customer details from Stripe
    let customer = null
    try {
      customer = await stripe.customers.retrieve(client.stripe_customer_id)
      if ((customer as any).deleted) {
        customer = null
      }
    } catch (e) {
      console.error('Failed to fetch Stripe customer:', e)
    }

    // Fetch invoices from Stripe
    const invoicesResponse = await stripe.invoices.list({
      customer: client.stripe_customer_id,
      limit: 100,
      expand: ['data.subscription'],
    })

    // Format invoices for frontend
    const invoices = invoicesResponse.data.map(invoice => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amountDue: invoice.amount_due / 100, // Convert from cents
      amountPaid: invoice.amount_paid / 100,
      amountRemaining: invoice.amount_remaining / 100,
      subtotal: invoice.subtotal / 100,
      total: invoice.total / 100,
      tax: (invoice as any).tax ? (invoice as any).tax / 100 : null,
      currency: invoice.currency.toUpperCase(),
      created: invoice.created ? new Date(invoice.created * 1000).toISOString() : null,
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
      paidAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
        : null,
      periodStart: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
      periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      description: invoice.description,
      subscriptionId: typeof (invoice as any).subscription === 'string'
        ? (invoice as any).subscription
        : (invoice as any).subscription?.id,
      lines: invoice.lines.data.map(line => ({
        id: line.id,
        description: line.description,
        amount: line.amount / 100,
        quantity: line.quantity,
        period: line.period ? {
          start: new Date(line.period.start * 1000).toISOString(),
          end: new Date(line.period.end * 1000).toISOString(),
        } : null,
      })),
    }))

    // Format customer for frontend
    const customerData = customer && !(customer as any).deleted ? {
      id: (customer as any).id,
      email: (customer as any).email,
      name: (customer as any).name,
      phone: (customer as any).phone,
      created: (customer as any).created ? new Date((customer as any).created * 1000).toISOString() : null,
      balance: (customer as any).balance ? (customer as any).balance / 100 : 0,
      currency: (customer as any).currency?.toUpperCase() || 'USD',
      defaultPaymentMethod: (customer as any).invoice_settings?.default_payment_method || null,
    } : null

    return NextResponse.json({
      invoices,
      customer: customerData,
      stripeCustomerId: client.stripe_customer_id,
    })
  } catch (error) {
    console.error('Failed to fetch invoices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}
