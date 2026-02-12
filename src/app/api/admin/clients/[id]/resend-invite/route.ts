import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { randomBytes } from 'crypto'
import { sendTemplatedEmail } from '@/lib/email/template-service'
import { isEmailConfigured } from '@/lib/email/mailgun'
import { logEmailError } from '@/lib/alerts'

export const dynamic = 'force-dynamic';

// POST /api/admin/clients/[id]/resend-invite - Resend invitation email to client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ((auth as any)?.user === undefined) return auth as any
    const { id: clientId } = await params

    // Get client info
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        contact_name: true,
        contact_email: true,
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Find the most recent recommendation with status 'sent' or 'draft'
    const recommendation = await prisma.recommendations.findFirst({
      where: {
        client_id: clientId,
        status: { in: ['sent', 'draft'] },
      },
      orderBy: { created_at: 'desc' },
    })

    if (!recommendation) {
      return NextResponse.json(
        { error: 'No recommendation found for this client' },
        { status: 404 }
      )
    }

    // Find existing invite or create new one
    let invite = await prisma.recommendation_invites.findFirst({
      where: {
        recommendation_id: recommendation.id,
      },
      orderBy: { created_at: 'desc' },
    })

    // Parse recipient info
    const recipientEmail = client.contact_email
    const recipientName = client.contact_name || client.name

    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'Client has no contact email' },
        { status: 400 }
      )
    }

    // Parse first name from contact name
    const nameParts = recipientName.split(' ')
    const firstName = nameParts[0] || 'there'
    const lastName = nameParts.slice(1).join(' ') || ''

    // Generate new token
    const inviteToken = randomBytes(32).toString('hex')

    if (invite) {
      // Update existing invite with new token and sent_at
      invite = await prisma.recommendation_invites.update({
        where: { id: invite.id },
        data: {
          invite_token: inviteToken,
          sent_at: new Date(),
          status: 'pending',
          first_name: firstName,
          last_name: lastName,
          email: recipientEmail.toLowerCase(),
        },
      })
    } else {
      // Create new invite
      invite = await prisma.recommendation_invites.create({
        data: {
          recommendation_id: recommendation.id,
          first_name: firstName,
          last_name: lastName,
          email: recipientEmail.toLowerCase(),
          invite_token: inviteToken,
          status: 'pending',
          sent_at: new Date(),
        },
      })
    }

    // Update recommendation status to 'sent' if it was 'draft'
    if (recommendation.status === 'draft') {
      await prisma.recommendations.update({
        where: { id: recommendation.id },
        data: {
          status: 'sent',
          sent_at: new Date(),
        },
      })
    }

    // Send the invite email
    let emailSent = false
    let emailError: string | undefined

    if (isEmailConfigured()) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const inviteUrl = `${appUrl}/view-proposal/${inviteToken}`

      const emailResult = await sendTemplatedEmail({
        templateSlug: 'recommendation-invite',
        to: recipientEmail,
        variables: {
          firstName,
          clientName: client.name,
          inviteUrl,
        },
        clientId,
        tags: ['recommendation-invite', 'resend'],
      })

      emailSent = emailResult.success
      emailError = emailResult.error
    } else {
      emailError = 'Email not configured'
      console.warn('Email not configured - invite created but email not sent')
    }

    // Log the communication
    try {
      await prisma.client_communications.create({
        data: {
          client_id: clientId,
          comm_type: 'email_invite',
          title: 'Proposal Invitation Resent',
          subject: `Your Personalized Marketing Proposal for ${client.name}`,
          body: `Invitation resent to ${recipientName} at ${recipientEmail}`,
          status: emailSent ? 'sent' : 'failed',
          recipient_email: recipientEmail,
          sent_at: new Date(),
          metadata: {
            recommendation_id: recommendation.id,
            invite_id: invite.id,
            is_resend: true,
            email_configured: isEmailConfigured(),
            email_error: emailError,
          },
        },
      })
    } catch (commError: any) {
      console.error('Failed to log communication:', commError)
      logEmailError(
        'Failed to log communication for resend invite',
        clientId,
        { error: commError.message },
        'admin/clients/[id]/resend-invite/route.ts'
      )
    }

    // Add history entry
    try {
      await prisma.recommendation_history.create({
        data: {
          recommendation_id: recommendation.id,
          action: 'Invitation resent',
          details: `Resent to ${recipientName} (${recipientEmail})`,
        },
      })
    } catch (historyError: any) {
      console.error('Failed to create recommendation history entry:', historyError)
      logEmailError(
        'Failed to create history entry for resend invite',
        clientId,
        { recommendationId: recommendation.id, error: historyError.message },
        'admin/clients/[id]/resend-invite/route.ts'
      )
    }

    return NextResponse.json({
      success: true,
      emailSent,
      emailError,
      recipientEmail,
      recipientName,
    })
  } catch (error: any) {
    console.error('Failed to resend invite:', error)
    logEmailError(
      `Resend invite failed: ${error.message || 'Unknown error'}`,
      undefined,
      { error: error.message },
      'admin/clients/[id]/resend-invite/route.ts'
    )
    return NextResponse.json(
      { error: 'Failed to resend invite' },
      { status: 500 }
    )
  }
}
