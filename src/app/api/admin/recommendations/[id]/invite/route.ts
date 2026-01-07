import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

// GET /api/admin/recommendations/[id]/invite - Get all invites for a recommendation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const invites = await prisma.recommendation_invites.findMany({
      where: { recommendation_id: id },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json(invites)
  } catch (error) {
    console.error('Failed to fetch invites:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    )
  }
}

// POST /api/admin/recommendations/[id]/invite - Create a new invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { firstName, lastName, email } = body

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      )
    }

    // Check if recommendation exists
    const recommendation = await prisma.recommendations.findUnique({
      where: { id },
    })

    if (!recommendation) {
      return NextResponse.json(
        { error: 'Recommendation not found' },
        { status: 404 }
      )
    }

    // Generate unique invite token
    const inviteToken = randomBytes(32).toString('hex')

    // Create the invite
    const invite = await prisma.recommendation_invites.create({
      data: {
        recommendation_id: id,
        first_name: firstName,
        last_name: lastName,
        email: email.toLowerCase(),
        invite_token: inviteToken,
        status: 'pending',
        sent_at: new Date(),
      },
    })

    // Update recommendation status to 'sent' if it was 'draft'
    if (recommendation.status === 'draft') {
      await prisma.recommendations.update({
        where: { id },
        data: {
          status: 'sent',
          sent_at: new Date(),
        },
      })
    }

    return NextResponse.json(invite, { status: 201 })
  } catch (error) {
    console.error('Failed to create invite:', error)
    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/recommendations/[id]/invite?inviteId=xxx - Delete an invite
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const inviteId = searchParams.get('inviteId')

    if (!inviteId) {
      return NextResponse.json(
        { error: 'Invite ID is required' },
        { status: 400 }
      )
    }

    // Verify invite belongs to this recommendation
    const invite = await prisma.recommendation_invites.findFirst({
      where: {
        id: inviteId,
        recommendation_id: id,
      },
    })

    if (!invite) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      )
    }

    await prisma.recommendation_invites.delete({
      where: { id: inviteId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete invite:', error)
    return NextResponse.json(
      { error: 'Failed to delete invite' },
      { status: 500 }
    )
  }
}
