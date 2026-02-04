import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { logAuthError } from '@/lib/alerts'
import type { User } from '@supabase/supabase-js'

type Profile = { role: string }

export async function requireAdmin(): Promise<NextResponse | { user: User; profile: { role: string } }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      logAuthError(
        'Admin auth check failed: No user session',
        'warning',
        { error: error?.message, step: 'get_user' },
        'auth/requireAdmin.ts'
      )
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    const adminRoles = ['super_admin', 'admin', 'production_team', 'sales']
    if (!profile || !adminRoles.includes(profile.role)) {
      logAuthError(
        'Admin auth check failed: Insufficient permissions',
        'warning',
        { userId: user.id, role: profile?.role, step: 'check_role' },
        'auth/requireAdmin.ts'
      )
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return { user, profile }
  } catch (error) {
    console.error('Admin auth check exception:', error)
    logAuthError(
      `Admin auth check exception: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'warning',
      { error: error instanceof Error ? error.message : String(error), step: 'require_admin' },
      'auth/requireAdmin.ts'
    )
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
