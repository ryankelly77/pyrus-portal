import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { validateRequest } from '@/lib/validation/validateRequest'
import { recommendationInviteSchema } from '@/lib/validation/schemas'
import { randomBytes } from 'crypto'
import { sendTemplatedEmail } from '@/lib/email/template-service'
import { isEmailConfigured } from '@/lib/email/mailgun'
import { logEmailError } from '@/lib/alerts'
import { triggerRecalculation } from '@/lib/pipeline/recalculate-score'

export const dynamic = 'force-dynamic'

// GET /api/admin/recommendations/[id]/invite - Get all invites for a recommendation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const { id } = await params

    const invites = await prisma.recommendation_invites.findMany({
      where: { recommendation_id: id },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json(invites)
  } catch (error: any) {
    console.error('Failed to fetch invites:', error)
    logEmailError(
      `Failed to fetch invites: ${error.message || 'Unknown error'}`,
      undefined,
      { error: error.message },
      'admin/recommendations/[id]/invite/route.ts'
    )
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
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const { id } = await params
    const validated = await validateRequest(recommendationInviteSchema, request)
    if ((validated as any).error) return (validated as any).error

    const { firstName, lastName, email, message } = (validated as any).data

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
      } catch (historyError: any) {
        console.error('Failed to create recommendation history entry:', historyError)
        logEmailError(
          'Failed to create history entry for invite',
          undefined,
          { recommendationId: id, error: historyError.message },
          'admin/recommendations/[id]/invite/route.ts'
        )
      }
    }

    // Send the invite email
    let emailSent = false
    let emailError: string | undefined

    if (isEmailConfigured()) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const inviteUrl = `${appUrl}/view-proposal/${inviteToken}`

      const emailResult = await sendTemplatedEmail({
        templateSlug: 'recommendation-invite',
        to: email,
        variables: {
          firstName,
          clientName: recommendation.client.name,
          inviteUrl,
        },
        clientId: recommendation.client.id,
        tags: ['recommendation-invite'],
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
    } catch (commError: any) {
      console.error('Failed to log communication:', commError)
      logEmailError(
        'Failed to log communication for invite',
        undefined,
        { recommendationId: id, error: commError.message },
        'admin/recommendations/[id]/invite/route.ts'
      )
      // Don't fail the request if communication logging fails
    }

    // Trigger score recalculation (non-blocking)
    triggerRecalculation(id, 'invite_sent').catch(console.error)

    return NextResponse.json({
      ...invite,
      emailSent,
      emailError,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Failed to create invite:', error)
    logEmailError(
      `Failed to create invite: ${error.message || 'Unknown error'}`,
      undefined,
      { error: error.message },
      'admin/recommendations/[id]/invite/route.ts'
    )
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
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
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
  } catch (error: any) {
    console.error('Failed to delete invite:', error)
    logEmailError(
      `Failed to delete invite: ${error.message || 'Unknown error'}`,
      undefined,
      { error: error.message },
      'admin/recommendations/[id]/invite/route.ts'
    )
    return NextResponse.json(
      { error: 'Failed to delete invite' },
      { status: 500 }
    )
  }
}
