import { NextRequest, NextResponse } from 'next/server'
import { prisma, dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

// GET /api/admin/clients/[id]/users - List all users linked to this client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { id: clientId } = await params

    // Get all users linked to this client via client_users table
    const clientUsers = await prisma.client_users.findMany({
      where: { client_id: clientId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            full_name: true,
            avatar_url: true,
            role: true,
          },
        },
      },
      orderBy: [
        { is_primary: 'desc' },
        { created_at: 'asc' },
      ],
    })

    // Transform to a cleaner response format
    const users = clientUsers.map(cu => ({
      id: cu.id,
      userId: cu.user_id,
      email: cu.user.email,
      fullName: cu.user.full_name,
      avatarUrl: cu.user.avatar_url,
      userRole: cu.user.role,
      clientRole: cu.role,
      isPrimary: cu.is_primary,
      receivesAlerts: cu.receives_alerts,
      createdAt: cu.created_at,
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching client users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client users' },
      { status: 500 }
    )
  }
}

// POST /api/admin/clients/[id]/users - Link a user to this client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { id: clientId } = await params
    const body = await request.json()
    const { email, role = 'member', isPrimary = false, receivesAlerts = true } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Find the user by email
    const user = await prisma.profiles.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, full_name: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. They must have an account first.' },
        { status: 404 }
      )
    }

    // Check if already linked
    const existing = await prisma.client_users.findUnique({
      where: {
        client_id_user_id: {
          client_id: clientId,
          user_id: user.id,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'User is already linked to this client' },
        { status: 400 }
      )
    }

    // If setting as primary, unset other primaries first
    if (isPrimary) {
      await prisma.client_users.updateMany({
        where: { client_id: clientId, is_primary: true },
        data: { is_primary: false },
      })
    }

    // Create the link
    const clientUser = await prisma.client_users.create({
      data: {
        client_id: clientId,
        user_id: user.id,
        role,
        is_primary: isPrimary,
        receives_alerts: receivesAlerts,
      },
    })

    // Also update the user's legacy client_id if they don't have one
    // This maintains backward compatibility
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { client_id: true },
    })
    if (!profile?.client_id) {
      await prisma.profiles.update({
        where: { id: user.id },
        data: { client_id: clientId, active_client_id: clientId },
      })
    }

    return NextResponse.json({
      id: clientUser.id,
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      clientRole: role,
      isPrimary,
      receivesAlerts,
    })
  } catch (error) {
    console.error('Error linking user to client:', error)
    return NextResponse.json(
      { error: 'Failed to link user to client' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/clients/[id]/users - Update a client-user relationship
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { id: clientId } = await params
    const body = await request.json()
    const { clientUserId, role, isPrimary, receivesAlerts } = body

    if (!clientUserId) {
      return NextResponse.json({ error: 'clientUserId is required' }, { status: 400 })
    }

    // If setting as primary, unset other primaries first
    if (isPrimary === true) {
      await prisma.client_users.updateMany({
        where: { client_id: clientId, is_primary: true },
        data: { is_primary: false },
      })
    }

    // Build update data
    const updateData: any = { updated_at: new Date() }
    if (role !== undefined) updateData.role = role
    if (isPrimary !== undefined) updateData.is_primary = isPrimary
    if (receivesAlerts !== undefined) updateData.receives_alerts = receivesAlerts

    const updated = await prisma.client_users.update({
      where: { id: clientUserId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            full_name: true,
          },
        },
      },
    })

    return NextResponse.json({
      id: updated.id,
      userId: updated.user_id,
      email: updated.user.email,
      fullName: updated.user.full_name,
      clientRole: updated.role,
      isPrimary: updated.is_primary,
      receivesAlerts: updated.receives_alerts,
    })
  } catch (error) {
    console.error('Error updating client user:', error)
    return NextResponse.json(
      { error: 'Failed to update client user' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/clients/[id]/users - Remove a user from this client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { id: clientId } = await params
    const { searchParams } = new URL(request.url)
    const clientUserId = searchParams.get('clientUserId')

    if (!clientUserId) {
      return NextResponse.json({ error: 'clientUserId is required' }, { status: 400 })
    }

    // Get the client_user to find the user_id
    const clientUser = await prisma.client_users.findUnique({
      where: { id: clientUserId },
      select: { user_id: true },
    })

    if (!clientUser) {
      return NextResponse.json({ error: 'Client user not found' }, { status: 404 })
    }

    // Delete the link
    await prisma.client_users.delete({
      where: { id: clientUserId },
    })

    // Check if user has any other client links
    const otherLinks = await prisma.client_users.findMany({
      where: { user_id: clientUser.user_id },
      select: { client_id: true },
      take: 1,
    })

    // If no other links, clear their legacy client_id
    if (otherLinks.length === 0) {
      await prisma.profiles.update({
        where: { id: clientUser.user_id },
        data: { client_id: null, active_client_id: null },
      })
    } else {
      // If they had this client as active, switch to another
      const profile = await prisma.profiles.findUnique({
        where: { id: clientUser.user_id },
        select: { active_client_id: true },
      })
      if (profile?.active_client_id === clientId) {
        await prisma.profiles.update({
          where: { id: clientUser.user_id },
          data: { active_client_id: otherLinks[0].client_id },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing client user:', error)
    return NextResponse.json(
      { error: 'Failed to remove client user' },
      { status: 500 }
    )
  }
}
