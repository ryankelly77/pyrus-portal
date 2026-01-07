import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/clients - Get all clients
export async function GET() {
  try {
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
    const body = await request.json()

    const {
      name,
      contactName,
      contactEmail,
      growthStage,
      status,
      notes,
    } = body

    const client = await prisma.clients.create({
      data: {
        name,
        contact_name: contactName || null,
        contact_email: contactEmail || null,
        growth_stage: growthStage || null,
        status: status || 'active',
        notes: notes || null,
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
