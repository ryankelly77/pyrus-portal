import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { clientCreateSchema } from '@/lib/validation/schemas'
import { validateRequest } from '@/lib/validation/validateRequest'

// GET /api/admin/clients - Get all clients
export async function GET() {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth

    const clients = await prisma.clients.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error('Failed to fetch clients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}

// POST /api/admin/clients - Create a new client
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ((auth as any)?.user === undefined) return auth as any

    const validated = await validateRequest(clientCreateSchema, request)
    if ((validated as any).error) return (validated as any).error

    const {
      name,
      contactName,
      contactEmail,
      growthStage,
      status,
      notes,
      basecampProjectId,
      dashboardToken,
      stripeCustomerId,
    } = (validated as any).data

    const client = await prisma.clients.create({
      data: {
        name,
        contact_name: contactName || null,
        contact_email: contactEmail || null,
        growth_stage: growthStage || null,
        status: status || 'active',
        notes: notes || null,
        basecamp_project_id: basecampProjectId || null,
        agency_dashboard_share_key: dashboardToken || null,
        stripe_customer_id: stripeCustomerId || null,
      },
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error('Failed to create client:', error)
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    )
  }
}
