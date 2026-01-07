import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/clients/[id] - Get a single client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const { id } = await params
    const body = await request.json()

    const {
      name,
      contactName,
      contactEmail,
      growthStage,
      status,
      notes,
    } = body

    const client = await prisma.clients.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(contactName !== undefined && { contact_name: contactName || null }),
        ...(contactEmail !== undefined && { contact_email: contactEmail || null }),
        ...(growthStage !== undefined && { growth_stage: growthStage || null }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes: notes || null }),
        updated_at: new Date(),
      },
    })

    return NextResponse.json(client)
  } catch (error) {
    console.error('Failed to update client:', error)
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    )
  }
}
