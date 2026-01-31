import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSubscriptionData } from '@/lib/services/subscriptionService'

export const dynamic = 'force-dynamic'

// GET /api/client/recommendation?clientName=xxx - Get recommendation for client by name
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientName = searchParams.get('clientName')
    const clientId = searchParams.get('clientId')

    if (!clientName && !clientId) {
      return NextResponse.json(
        { error: 'Client name or ID is required' },
        { status: 400 }
      )
    }

    // Find the client
    let client
    if (clientId) {
      client = await prisma.clients.findUnique({
        where: { id: clientId },
      })
    } else if (clientName) {
      // Search by name (case-insensitive, partial match)
      client = await prisma.clients.findFirst({
        where: {
          name: {
            contains: clientName.replace(/-/g, ' '),
            mode: 'insensitive',
          },
        },
      })
    }

    if (!client) {
      return NextResponse.json(null)
    }

    // Find the recommendation for this client
    const recommendation = await prisma.recommendations.findFirst({
      where: {
        client_id: client.id,
        status: { in: ['draft', 'sent', 'accepted'] },
      },
      include: {
        client: true,
        recommendation_items: {
          include: {
            product: true,
            bundle: true,
            addon: true,
          },
        },
        history: {
          orderBy: { created_at: 'desc' },
          take: 20,
        },
      },
      orderBy: { updated_at: 'desc' },
    })

    // Fetch subscription data using shared service (includes discounts, invoices, etc.)
    let subscriptions = null
    try {
      subscriptions = await getSubscriptionData(client.id)
    } catch (subError) {
      console.error('Failed to fetch subscription data:', subError)
    }

    if (!recommendation) {
      return NextResponse.json({ client, recommendation: null, subscriptions })
    }

    // Track view if recommendation exists
    try {
      // Check for recent view to avoid duplicates
      const recentView = await prisma.recommendation_history.findFirst({
        where: {
          recommendation_id: recommendation.id,
          action: 'Client viewed recommendation',
          created_at: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
          },
        },
      })

      if (!recentView) {
        await prisma.recommendation_history.create({
          data: {
            recommendation_id: recommendation.id,
            action: 'Client viewed recommendation',
            details: `Viewed by ${client.contact_name || client.name}`,
          },
        })
      }
    } catch {
      // Don't fail if view tracking fails
    }

    return NextResponse.json({
      client,
      recommendation,
      subscriptions,
    })
  } catch (error) {
    console.error('Failed to fetch client recommendation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recommendation' },
      { status: 500 }
    )
  }
}
