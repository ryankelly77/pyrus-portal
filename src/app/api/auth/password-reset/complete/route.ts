import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Initialize Supabase Admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Check Supabase configuration
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase admin credentials not configured')
      return NextResponse.json(
        { error: 'Service not configured. Please contact support.' },
        { status: 500 }
      )
    }

    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    // Find valid token
    const tokenResult = await dbPool.query(
      `SELECT pr.id, pr.user_id, p.email
       FROM password_resets pr
       JOIN profiles p ON p.id = pr.user_id
       WHERE pr.token_hash = $1
         AND pr.expires_at > NOW()
         AND pr.used_at IS NULL`,
      [tokenHash]
    )

    if (tokenResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link. Please request a new one.' },
        { status: 400 }
      )
    }

    const resetRecord = tokenResult.rows[0]

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Update user password using Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      resetRecord.user_id,
      { password }
    )

    if (updateError) {
      console.error('Failed to update password:', updateError)
      return NextResponse.json(
        { error: 'Failed to update password. Please try again.' },
        { status: 500 }
      )
    }

    // Mark token as used
    await dbPool.query(
      'UPDATE password_resets SET used_at = NOW() WHERE id = $1',
      [resetRecord.id]
    )

    console.log(`Password reset completed for user: ${resetRecord.email}`)

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully. You can now log in.'
    })

  } catch (error) {
    console.error('Error completing password reset:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
