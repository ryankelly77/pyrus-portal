import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { sendTemplatedEmail } from '@/lib/email/template-service'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

interface InviteRequest {
  email: string
  fullName: string
  phone?: string
  role: 'client' | 'admin' | 'super_admin' | 'production_team' | 'sales'
  clientIds?: string[] // Required if role is 'client'
}

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
 * Each role has a distinct set of portal capabilities
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

// POST /api/admin/users/invite - Send user invitation
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const body = await request.json() as InviteRequest
    const { email, fullName, phone, role, clientIds } = body

    // Validation
    if (!email || !fullName || !role) {
      return NextResponse.json(
        { error: 'Email, full name, and role are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['client', 'admin', 'super_admin', 'production_team', 'sales']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Sales/production_team can only invite client users
    if (!['super_admin', 'admin'].includes(auth.profile.role) && role !== 'client') {
      return NextResponse.json(
        { error: 'You can only invite client users' },
        { status: 403 }
      )
    }

    // Client role requires at least one client
    if (role === 'client' && (!clientIds || clientIds.length === 0)) {
      return NextResponse.json(
        { error: 'At least one client must be selected for client users' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await dbPool.query(
      'SELECT id FROM profiles WHERE email = $1',
      [email.toLowerCase()]
    )

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      )
    }

    // Check for existing pending invite
    const existingInvite = await dbPool.query(
      `SELECT id FROM user_invites
       WHERE email = $1 AND status = 'pending' AND expires_at > NOW()`,
      [email.toLowerCase()]
    )

    if (existingInvite.rows.length > 0) {
      return NextResponse.json(
        { error: 'A pending invitation already exists for this email' },
        { status: 409 }
      )
    }

    // Generate unique invite token
    const inviteToken = crypto.randomBytes(32).toString('hex')

    // Calculate expiration (7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Get client name for email (if client role)
    let clientName: string | undefined
    if (role === 'client' && clientIds && clientIds.length > 0) {
      const clientResult = await dbPool.query(
        'SELECT name FROM clients WHERE id = $1',
        [clientIds[0]]
      )
      clientName = clientResult.rows[0]?.name
    }

    // Create invite record
    const insertResult = await dbPool.query(
      `INSERT INTO user_invites (email, full_name, phone, role, client_ids, invite_token, invited_by, expires_at, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id`,
      [
        email.toLowerCase(),
        fullName,
        phone || null,
        role,
        clientIds || [],
        inviteToken,
        auth.user.id,
        expiresAt
      ]
    )

    const inviteId = insertResult.rows[0].id

    // Build invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.pyrusdigitalmedia.com'
    const inviteUrl = `${baseUrl}/accept-invite/${inviteToken}`

    // Get inviter name
    const inviterResult = await dbPool.query(
      'SELECT full_name FROM profiles WHERE id = $1',
      [auth.user.id]
    )
    const inviterName = inviterResult.rows[0]?.full_name || 'Pyrus Digital Media'

    // Get first name for email greeting
    const firstName = fullName.split(' ')[0]

    // Determine which template to use and prepare variables
    const isClientInvite = role === 'client'
    const templateSlug = isClientInvite ? 'user-invite-client' : 'user-invite-admin'

    const variables: Record<string, string> = {
      firstName,
      inviteUrl,
      inviterName,
    }

    if (isClientInvite) {
      // Client invite needs clientName
      variables.clientName = clientName || 'your organization'
    } else {
      // Admin/team invite needs roleDisplay and accessListHtml
      variables.roleDisplay = getRoleDisplayName(role)
      variables.accessListHtml = generateAccessListHtml(role)
    }

    // Send templated email
    const emailResult = await sendTemplatedEmail({
      templateSlug,
      to: email,
      variables,
      userId: undefined, // New user doesn't exist yet
      tags: ['user-invite', role],
    })

    if (!emailResult.success) {
      // Update invite status to indicate email failed
      await dbPool.query(
        `UPDATE user_invites SET status = 'email_failed' WHERE id = $1`,
        [inviteId]
      )

      console.error('Failed to send invitation email:', emailResult.error)
      return NextResponse.json(
        { error: `Failed to send invitation email: ${emailResult.error}` },
        { status: 500 }
      )
    }

    // Log activity (non-blocking - don't fail invite if logging fails)
    try {
      await dbPool.query(
        `INSERT INTO activity_log (user_id, activity_type, description, metadata)
         VALUES ($1, $2, $3, $4)`,
        [
          auth.user.id,
          'invited_user',
          `Invited ${fullName} (${email}) as ${role}`,
          JSON.stringify({
            invited_email: email,
            invited_name: fullName,
            role,
            client_ids: clientIds || [],
            invite_id: inviteId
          })
        ]
      )
    } catch (logError) {
      console.error('Failed to log activity (non-critical):', logError)
    }

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}`,
      inviteId
    })

  } catch (error) {
    console.error('Error sending user invitation:', error)
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    )
  }
}
