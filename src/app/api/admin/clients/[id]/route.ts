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
      referredBy,
      referralSource,
      avatarColor,
      // Integration fields
      agencyDashboardShareKey,
      basecampId,
      basecampProjectId,
      landsitePreviewUrl,
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
        ...(referredBy !== undefined && { referred_by: referredBy || null }),
        ...(referralSource !== undefined && { referral_source: referralSource || null }),
        ...(avatarColor !== undefined && { avatar_color: avatarColor || null }),
        // Integration fields
        ...(agencyDashboardShareKey !== undefined && { agency_dashboard_share_key: agencyDashboardShareKey || null }),
        ...(basecampId !== undefined && { basecamp_id: basecampId || null }),
        ...(basecampProjectId !== undefined && { basecamp_project_id: basecampProjectId || null }),
        ...(landsitePreviewUrl !== undefined && { landingsite_preview_url: landsitePreviewUrl || null }),
        updated_at: new Date(),
      },
    })

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
      } catch {
        // Table may not exist
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
