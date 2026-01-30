import { NextRequest, NextResponse } from 'next/server'
import { prisma, dbPool } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// Helper function to sync Stripe subscriptions to local database
async function syncStripeSubscriptions(clientId: string, stripeCustomerId: string) {
  try {
    const subscriptionsResponse = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'all',
    })

    for (const sub of subscriptionsResponse.data) {
      const subAny = sub as any // Access snake_case properties
      const existing = await dbPool.query(
        'SELECT id FROM subscriptions WHERE stripe_subscription_id = $1',
        [sub.id]
      )

      let subscriptionId: string

      if (existing.rows.length > 0) {
        subscriptionId = existing.rows[0].id
        await dbPool.query(
          `UPDATE subscriptions SET status = $1, current_period_start = to_timestamp($2), current_period_end = to_timestamp($3), updated_at = NOW() WHERE id = $4`,
          [sub.status, subAny.current_period_start, subAny.current_period_end, subscriptionId]
        )
      } else {
        const result = await dbPool.query(
          `INSERT INTO subscriptions (client_id, stripe_subscription_id, status, current_period_start, current_period_end) VALUES ($1, $2, $3, to_timestamp($4), to_timestamp($5)) RETURNING id`,
          [clientId, sub.id, sub.status, subAny.current_period_start, subAny.current_period_end]
        )
        subscriptionId = result.rows[0].id
      }

      for (const item of sub.items.data) {
        const productId = typeof item.price.product === 'string' ? item.price.product : (item.price.product as any)?.id
        if (!productId) continue

        const productResult = await dbPool.query('SELECT id FROM products WHERE stripe_product_id = $1', [productId])
        if (productResult.rows.length === 0) continue

        const localProductId = productResult.rows[0].id
        const existingItem = await dbPool.query('SELECT id FROM subscription_items WHERE subscription_id = $1 AND product_id = $2', [subscriptionId, localProductId])

        if (existingItem.rows.length === 0) {
          await dbPool.query(
            `INSERT INTO subscription_items (subscription_id, product_id, stripe_subscription_item_id, quantity, unit_amount) VALUES ($1, $2, $3, $4, $5)`,
            [subscriptionId, localProductId, item.id, item.quantity, item.price.unit_amount]
          )
        }
      }
    }
  } catch (error) {
    console.error('Failed to sync Stripe subscriptions:', error)
  }
}

// GET /api/admin/clients/[id] - Get a single client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const { id } = await params

    const client = await prisma.clients.findUnique({
      where: { id },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error('Failed to fetch client:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/clients/[id] - Update a client
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const { id } = await params
    const body = await request.json()

    const {
      name,
      contactName,
      contactEmail,
      growthStage,
      status,
      notes,
      referredBy,
      referralSource,
      avatarColor,
      // Website fields
      websiteUrl,
      hostingType,
      hostingProvider,
      websiteLaunchDate,
      uptimerobotMonitorId,
      // Integration fields
      agencyDashboardShareKey,
      dashboardToken, // alias for agencyDashboardShareKey
      basecampId,
      basecampProjectId,
      stripeCustomerId,
    } = body

    // Use dashboardToken if provided, otherwise use agencyDashboardShareKey
    const dashboardKey = dashboardToken !== undefined ? dashboardToken : agencyDashboardShareKey

    const client = await prisma.clients.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(contactName !== undefined && { contact_name: contactName || null }),
        ...(contactEmail !== undefined && { contact_email: contactEmail || null }),
        ...(growthStage !== undefined && { growth_stage: growthStage || null }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(referredBy !== undefined && { referred_by: referredBy || null }),
        ...(referralSource !== undefined && { referral_source: referralSource || null }),
        ...(avatarColor !== undefined && { avatar_color: avatarColor || null }),
        // Website fields
        ...(websiteUrl !== undefined && { website_url: websiteUrl || null }),
        ...(hostingType !== undefined && { hosting_type: hostingType || null }),
        ...(hostingProvider !== undefined && { hosting_provider: hostingProvider || null }),
        ...(websiteLaunchDate !== undefined && { website_launch_date: websiteLaunchDate ? new Date(websiteLaunchDate) : null }),
        ...(uptimerobotMonitorId !== undefined && { uptimerobot_monitor_id: uptimerobotMonitorId || null }),
        // Integration fields
        ...(dashboardKey !== undefined && { agency_dashboard_share_key: dashboardKey || null }),
        ...(basecampId !== undefined && { basecamp_id: basecampId || null }),
        ...(basecampProjectId !== undefined && { basecamp_project_id: basecampProjectId || null }),
        ...(stripeCustomerId !== undefined && { stripe_customer_id: stripeCustomerId || null }),
        updated_at: new Date(),
      },
    })

    // Auto-sync Stripe subscriptions when Stripe customer ID is set
    if (stripeCustomerId) {
      await syncStripeSubscriptions(id, stripeCustomerId)
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error('Failed to update client:', error)
    return NextResponse.json(
      { error: 'Failed to update client', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/clients/[id] - Delete a client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const { id } = await params

    // Delete related records first (foreign key constraints)
    // Delete recommendation items for this client's recommendations
    const recommendations = await prisma.recommendations.findMany({
      where: { client_id: id },
      select: { id: true },
    })

    for (const rec of recommendations) {
      await prisma.recommendation_items.deleteMany({
        where: { recommendation_id: rec.id },
      })
      // Try to delete invites if table exists
      try {
        await prisma.recommendation_invites.deleteMany({
          where: { recommendation_id: rec.id },
        })
      } catch (inviteError) {
        console.warn('Could not delete recommendation invites (table may not exist):', inviteError)
      }
    }

    // Delete recommendations
    await prisma.recommendations.deleteMany({
      where: { client_id: id },
    })

    // Delete the client
    await prisma.clients.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete client:', error)
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    )
  }
}
