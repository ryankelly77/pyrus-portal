import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

// PUT /api/client/billing - Update billing information
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the client ID - either from query param (admin viewing as) or from user profile
    const searchParams = request.nextUrl.searchParams
    const viewingAsClientId = searchParams.get('clientId')

    let clientId: string

    if (viewingAsClientId) {
      // Admin viewing as client - verify admin role
      const profile = await prisma.profiles.findUnique({
        where: { id: user.id },
        select: { role: true },
      })

      if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      clientId = viewingAsClientId
    } else {
      // Regular client - get their client ID from profile
      const profile = await prisma.profiles.findUnique({
        where: { id: user.id },
        select: { client_id: true },
      })

      if (!profile?.client_id) {
        return NextResponse.json({ error: 'No client associated with this account' }, { status: 400 })
      }

      clientId = profile.client_id
    }

    // Get the client's Stripe customer ID
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: { stripe_customer_id: true, name: true },
    })

    if (!client?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 400 })
    }

    // Parse request body
    const body = await request.json()
    const { email, name, address } = body

    // Update the Stripe customer
    const updateData: {
      email?: string
      name?: string
      address?: {
        line1?: string
        city?: string
        state?: string
        postal_code?: string
        country?: string
      }
    } = {}

    if (email) {
      updateData.email = email
    }

    if (name) {
      updateData.name = name
    }

    if (address) {
      updateData.address = {
        line1: address.line1 || undefined,
        city: address.city || undefined,
        state: address.state || undefined,
        postal_code: address.postal_code || undefined,
        country: address.country || 'US',
      }
    }

    await stripe.customers.update(client.stripe_customer_id, updateData)

    // Also update the local client record if name changed
    if (name && name !== client.name) {
      await prisma.clients.update({
        where: { id: clientId },
        data: { name },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating billing:', error)
    return NextResponse.json(
      { error: 'Failed to update billing information' },
      { status: 500 }
    )
  }
}
