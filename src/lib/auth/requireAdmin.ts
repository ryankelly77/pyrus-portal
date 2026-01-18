import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { User } from '@supabase/supabase-js'

type Profile = { role: string }

export async function requireAdmin(): Promise<NextResponse | { user: User; profile: Profile }> {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.error('Supabase getUser error', error)
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: { role: true },
  })

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return { user, profile }
}
