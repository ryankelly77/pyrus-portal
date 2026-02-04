import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { sendEmail } from '@/lib/email/mailgun'
import { getUserInviteEmail } from '@/lib/email/templates/user-invite'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

interface InviteRequest {
  email: string
  fullName: string
  phone?: string
  role: 'client' | 'admin' | 'super_admin' | 'production_team' | 'sales'
  clientIds?: string[] // Required if role is 'client'
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
    const inviterName = inviterResult.rows[0]?.full_name

    // Generate email content
    const firstName = fullName.split(' ')[0]
    const emailContent = getUserInviteEmail({
      firstName,
      inviteUrl,
      role,
      clientName,
      inviterName
    })

    // Send email via Mailgun
    const emailResult = await sendEmail({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      tags: ['user-invite', role]
    })

    if (!emailResult.success) {
      // Update invite status to indicate email failed
      await dbPool.query(
        `UPDATE user_invites SET status = 'email_failed' WHERE id = $1`,
        [inviteId]
      )

      return NextResponse.json(
        { error: `Failed to send invitation email: ${emailResult.error}` },
        { status: 500 }
      )
    }

    // Log activity
    await dbPool.query(
      `INSERT INTO activity_log (profile_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        auth.user.id,
        'invited_user',
        'user_invite',
        inviteId,
        JSON.stringify({
          invited_email: email,
          invited_name: fullName,
          role,
          client_ids: clientIds || []
        })
      ]
    )

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
