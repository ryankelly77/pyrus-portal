import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/client/my-clients - Get all clients the current user is linked to
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check active_client_id
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { active_client_id: true, client_id: true },
    })

    // Get all clients user is linked to via client_users table
    const clientUsers = await prisma.client_users.findMany({
      where: { user_id: user.id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            avatar_color: true,
            avatar_url: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
    })

    // Transform to cleaner format
    const clients = clientUsers.map(cu => ({
      id: cu.client.id,
      name: cu.client.name,
      avatarColor: cu.client.avatar_color,
      avatarUrl: cu.client.avatar_url,
      role: cu.role,
      isActive: cu.client_id === (profile?.active_client_id || profile?.client_id),
    }))

    // If user has no client_users but has legacy client_id, include that
    if (clients.length === 0 && profile?.client_id) {
      const legacyClient = await prisma.clients.findUnique({
        where: { id: profile.client_id },
        select: {
          id: true,
          name: true,
          avatar_color: true,
          avatar_url: true,
        },
      })
      if (legacyClient) {
        clients.push({
          id: legacyClient.id,
          name: legacyClient.name,
          avatarColor: legacyClient.avatar_color,
          avatarUrl: legacyClient.avatar_url,
          role: 'member',
          isActive: true,
        })
      }
    }

    return NextResponse.json({
      clients,
      activeClientId: profile?.active_client_id || profile?.client_id || null,
    })
  } catch (error) {
    console.error('Error fetching user clients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}

// POST /api/client/my-clients - Switch active client
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { clientId } = body

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    // Verify user has access to this client
    const clientUser = await prisma.client_users.findUnique({
      where: {
        client_id_user_id: {
          client_id: clientId,
          user_id: user.id,
        },
      },
    })

    // Also check legacy client_id
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { client_id: true },
    })

    if (!clientUser && profile?.client_id !== clientId) {
      return NextResponse.json({ error: 'Access denied to this client' }, { status: 403 })
    }

    // Update active_client_id
    await prisma.profiles.update({
      where: { id: user.id },
      data: { active_client_id: clientId },
    })

    return NextResponse.json({ success: true, activeClientId: clientId })
  } catch (error) {
    console.error('Error switching client:', error)
    return NextResponse.json(
      { error: 'Failed to switch client' },
      { status: 500 }
    )
  }
}
