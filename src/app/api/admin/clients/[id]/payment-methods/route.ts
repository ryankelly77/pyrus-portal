import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>
}

export interface PaymentMethodData {
  id: string
  type: string
  card?: {
    brand: string
    last4: string
    expMonth: number
    expYear: number
  }
  usBankAccount?: {
    bankName: string
    last4: string
    accountType: string
  }
  link?: {
    email: string
  }
  isDefault: boolean
  created: string
}

// GET /api/admin/clients/[id]/payment-methods - Get payment methods for a client
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
        paymentMethods: [],
        defaultPaymentMethodId: null,
        message: 'No Stripe customer ID linked to this client',
      })
    }

    // Fetch customer to get default payment method and billing email
    let defaultPaymentMethodId: string | null = null
    let billingEmail: string | null = null
    let customerName: string | null = null
    try {
      const customer = await stripe.customers.retrieve(client.stripe_customer_id)
      if (!(customer as any).deleted) {
        defaultPaymentMethodId = (customer as any).invoice_settings?.default_payment_method || null
        billingEmail = (customer as any).email || null
        customerName = (customer as any).name || null
      }
    } catch (e) {
      console.error('Failed to fetch Stripe customer:', e)
    }

    // Fetch ALL payment methods from Stripe (using customers.listPaymentMethods to get all types)
    const paymentMethodsResponse = await stripe.customers.listPaymentMethods(client.stripe_customer_id)

    // Format payment methods for frontend
    const paymentMethods: PaymentMethodData[] = paymentMethodsResponse.data.map(pm => ({
      id: pm.id,
      type: pm.type,
      card: pm.card ? {
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
      } : undefined,
      usBankAccount: pm.us_bank_account ? {
        bankName: pm.us_bank_account.bank_name || 'Bank Account',
        last4: pm.us_bank_account.last4 || '****',
        accountType: pm.us_bank_account.account_type || 'checking',
      } : undefined,
      link: pm.link ? {
        email: pm.link.email || '',
      } : undefined,
      isDefault: pm.id === defaultPaymentMethodId,
      created: new Date(pm.created * 1000).toISOString(),
    }))

    return NextResponse.json({
      paymentMethods,
      defaultPaymentMethodId,
      stripeCustomerId: client.stripe_customer_id,
      billingEmail,
      customerName,
    })
  } catch (error) {
    console.error('Failed to fetch payment methods:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment methods' },
      { status: 500 }
    )
  }
}
