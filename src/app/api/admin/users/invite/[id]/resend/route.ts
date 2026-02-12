import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { sendTemplatedEmail } from '@/lib/email/template-service'
import crypto from 'crypto'

/**
 * Convert raw role to human-readable display name
 */
function getRoleDisplayName(role: string): string {
  const roleDisplayNames: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    production_team: 'Production Team',
    sales: 'Sales',
    client: 'Client User',
  }
  return roleDisplayNames[role] || role
}

/**
 * Get role-specific access items for invite email
 */
function getRoleAccessItems(role: string): string[] {
  const roleAccessItems: Record<string, string[]> = {
    super_admin: [
      'Full admin dashboard access',
      'User and team management',
      'System settings and configuration',
    ],
    admin: [
      'Full admin dashboard access',
      'Client and user management',
      'Analytics and reporting',
    ],
    production_team: [
      'Content workflow management',
      'Client content review tools',
      'Production dashboard access',
    ],
    sales: [
      'Sales pipeline and proposals',
      'Client onboarding tools',
      'Revenue reporting access',
    ],
  }
  return roleAccessItems[role] || roleAccessItems.admin
}

/**
 * Generate HTML for the access list in invite emails
 */
function generateAccessListHtml(role: string): string {
  const items = getRoleAccessItems(role)
  return items
    .map(
      (item) =>
        `<tr><td style="padding: 8px 0; font-size: 14px; color: #5A6358;"><span style="color: #324438; margin-right: 8px;">&#10003;</span> ${item}</td></tr>`
    )
    .join('\n                      ')
}

export const dynamic = 'force-dynamic'

// POST /api/admin/users/invite/[id]/resend - Resend user invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    // Find the existing invite
    const inviteResult = await dbPool.query(
      `SELECT id, email, full_name, role, client_ids, status
       FROM user_invites
       WHERE id = $1`,
      [id]
    )

    if (inviteResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    const invite = inviteResult.rows[0]

    // Check if already accepted
    if (invite.status === 'accepted') {
      return NextResponse.json(
        { error: 'This invitation has already been accepted' },
        { status: 400 }
      )
    }

    // Generate new invite token
    const newToken = crypto.randomBytes(32).toString('hex')

    // Calculate new expiration (7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Update the invite with new token and expiration
    await dbPool.query(
      `UPDATE user_invites
       SET invite_token = $1, expires_at = $2, status = 'pending', sent_at = NOW()
       WHERE id = $3`,
      [newToken, expiresAt, id]
    )

    // Get client name for email (if client role)
    let clientName: string | undefined
    if (invite.role === 'client' && invite.client_ids?.length > 0) {
      const clientResult = await dbPool.query(
        'SELECT name FROM clients WHERE id = $1',
        [invite.client_ids[0]]
      )
      clientName = clientResult.rows[0]?.name
    }

    // Build invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.pyrusdigitalmedia.com'
    const inviteUrl = `${baseUrl}/accept-invite/${newToken}`

    // Get inviter name
    const inviterResult = await dbPool.query(
      'SELECT full_name FROM profiles WHERE id = $1',
      [auth.user.id]
    )
    const inviterName = inviterResult.rows[0]?.full_name

    // Determine which template to use and prepare variables
    const firstName = invite.full_name?.split(' ')[0] || 'there'
    const isClientInvite = invite.role === 'client'
    const templateSlug = isClientInvite ? 'user-invite-client' : 'user-invite-admin'

    const variables: Record<string, string> = {
      firstName,
      inviteUrl,
      inviterName: inviterName || 'Pyrus Digital Media',
    }

    if (isClientInvite) {
      variables.clientName = clientName || 'your organization'
    } else {
      variables.roleDisplay = getRoleDisplayName(invite.role)
      variables.accessListHtml = generateAccessListHtml(invite.role)
    }

    // Send templated email
    const emailResult = await sendTemplatedEmail({
      templateSlug,
      to: invite.email,
      variables,
      tags: ['user-invite', 'resend', invite.role],
    })

    if (!emailResult.success) {
      // Update invite status to indicate email failed
      await dbPool.query(
        `UPDATE user_invites SET status = 'email_failed' WHERE id = $1`,
        [id]
      )

      return NextResponse.json(
        { error: `Failed to send invitation email: ${emailResult.error}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Invitation resent to ${invite.email}`,
    })

  } catch (error) {
    console.error('Error resending user invitation:', error)
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    )
  }
}
