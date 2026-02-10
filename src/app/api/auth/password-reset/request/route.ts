import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { sendEmail, isEmailConfigured } from '@/lib/email/mailgun'
import { getPasswordResetEmail } from '@/lib/email/templates/password-reset'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.pyrusdigitalmedia.com'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if user exists
    const userResult = await dbPool.query(
      'SELECT id, full_name, email FROM profiles WHERE email = $1',
      [normalizedEmail]
    )

    // Always return success to prevent email enumeration attacks
    // But only actually send email if user exists
    if (userResult.rows.length === 0) {
      console.log(`Password reset requested for non-existent email: ${normalizedEmail}`)
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.'
      })
    }

    const user = userResult.rows[0]
    const firstName = user.full_name?.split(' ')[0] || 'there'

    // Check if email is configured
    if (!isEmailConfigured()) {
      console.error('Email not configured for password reset')
      return NextResponse.json(
        { error: 'Email service not configured. Please contact support.' },
        { status: 500 }
      )
    }

    // Generate secure token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    // Delete any existing unused tokens for this user
    await dbPool.query(
      'DELETE FROM password_resets WHERE user_id = $1 AND used_at IS NULL',
      [user.id]
    )

    // Insert new token
    await dbPool.query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    )

    // Build reset URL
    const resetUrl = `${BASE_URL}/reset-password?token=${resetToken}`

    // Generate and send email
    const emailContent = getPasswordResetEmail({
      firstName,
      resetUrl
    })

    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      tags: ['password-reset']
    })

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error)
      return NextResponse.json(
        { error: 'Failed to send reset email. Please try again.' },
        { status: 500 }
      )
    }

    console.log(`Password reset email sent to ${normalizedEmail}`)

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.'
    })

  } catch (error) {
    console.error('Error in password reset request:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
