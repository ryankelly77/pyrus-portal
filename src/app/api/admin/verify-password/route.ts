import { NextRequest, NextResponse } from 'next/server'

// Super admin password for sensitive operations
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'pyrus2024!'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json(
        { valid: false, error: 'Password is required' },
        { status: 400 }
      )
    }

    const isValid = password === SUPER_ADMIN_PASSWORD

    return NextResponse.json({ valid: isValid })
  } catch (error) {
    console.error('Error verifying password:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to verify password' },
      { status: 500 }
    )
  }
}
