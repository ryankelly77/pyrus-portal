import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { sendEmail, isEmailConfigured } from '@/lib/email/mailgun'
import { getRecommendationInviteEmail } from '@/lib/email/templates/recommendation-invite'

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

    // Check if recommendation exists and get client info
    const recommendation = await prisma.recommendations.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            contact_name: true,
          },
        },
      },
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

      // Add history entry for sending
      try {
        await prisma.recommendation_history.create({
          data: {
            recommendation_id: id,
            action: 'Recommendation sent',
            details: `Sent to ${firstName} ${lastName} (${email})`,
          },
        })
      } catch {
        // Don't fail if history creation fails
      }
    }

    // Send the invite email
    let emailSent = false
    let emailError: string | undefined

    if (isEmailConfigured()) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const inviteUrl = `${appUrl}/view-proposal/${inviteToken}`

      const emailContent = getRecommendationInviteEmail({
        firstName,
        clientName: recommendation.client.name,
        inviteUrl,
      })

      const emailResult = await sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      })

      emailSent = emailResult.success
      emailError = emailResult.error
    } else {
      console.warn('Email not configured - invite created but email not sent')
    }

    // Log the communication
    try {
      await prisma.client_communications.create({
        data: {
          client_id: recommendation.client.id,
          comm_type: 'email_invite',
          title: 'Proposal Invitation Sent',
          subject: `Your Personalized Marketing Proposal for ${recommendation.client.name}`,
          body: `Invitation sent to ${firstName} ${lastName} at ${email}`,
          status: emailSent ? 'sent' : 'failed',
          recipient_email: email,
          sent_at: new Date(),
          metadata: {
            recommendation_id: id,
            invite_id: invite.id,
            email_configured: isEmailConfigured(),
            email_error: emailError,
          },
        },
      })
    } catch (commError) {
      console.error('Failed to log communication:', commError)
      // Don't fail the request if communication logging fails
    }

    return NextResponse.json({
      ...invite,
      emailSent,
      emailError,
    }, { status: 201 })
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
