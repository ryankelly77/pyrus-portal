import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

// GET /api/admin/clients/[id]/content - Get all content for a client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const { id: clientId } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: { client_id: string; status?: string } = { client_id: clientId }
    if (status) {
      where.status = status
    }

    const content = await prisma.content.findMany({
      where,
      include: {
        author: {
          select: { id: true, full_name: true, email: true },
        },
        assignee: {
          select: { id: true, full_name: true, email: true },
        },
      },
      orderBy: [
        { due_date: 'asc' },
        { created_at: 'desc' },
      ],
    })

    return NextResponse.json(content)
  } catch (error) {
    console.error('Failed to fetch content:', error)
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    )
  }
}

// POST /api/admin/clients/[id]/content - Create new content
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ((auth as any)?.user === undefined) return auth as any
    const { id: clientId } = await params
    const body = await request.json()
    const {
      title,
      content_type,
      body: contentBody,
      status = 'draft',
      author_id,
      assigned_to,
      due_date,
    } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const content = await prisma.content.create({
      data: {
        client_id: clientId,
        title,
        content_type,
        body: contentBody,
        status,
        author_id,
        assigned_to,
        due_date: due_date ? new Date(due_date) : null,
      },
      include: {
        author: {
          select: { id: true, full_name: true, email: true },
        },
        assignee: {
          select: { id: true, full_name: true, email: true },
        },
      },
    })

    return NextResponse.json(content, { status: 201 })
  } catch (error) {
    console.error('Failed to create content:', error)
    return NextResponse.json(
      { error: 'Failed to create content' },
      { status: 500 }
    )
  }
}
