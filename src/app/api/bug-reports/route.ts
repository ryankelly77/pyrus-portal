import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// POST /api/bug-reports - Create a new bug report
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { id: true, client_id: true, role: true }
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Only link to client if user is not an admin (admins may have test client_ids)
    const isAdmin = profile.role === 'super_admin' || profile.role === 'admin'
    const clientId = isAdmin ? null : profile.client_id

    const body = await request.json()
    const {
      pageUrl,
      pageTitle,
      userAgent,
      screenSize,
      title,
      description,
      stepsToReproduce,
      expectedBehavior,
      consoleLogs,
    } = body

    // Validate required fields
    if (!pageUrl || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: pageUrl, title, description' },
        { status: 400 }
      )
    }

    // Create the bug report
    const bugReport = await prisma.bug_reports.create({
      data: {
        user_id: profile.id,
        client_id: clientId,
        page_url: pageUrl,
        page_title: pageTitle || null,
        user_agent: userAgent || null,
        screen_size: screenSize || null,
        title,
        description,
        steps_to_reproduce: stepsToReproduce || null,
        expected_behavior: expectedBehavior || null,
        console_logs: consoleLogs || null,
        status: 'new',
      },
      select: {
        id: true,
        title: true,
        status: true,
        created_at: true,
      }
    })

    return NextResponse.json(bugReport, { status: 201 })
  } catch (error) {
    console.error('Failed to create bug report:', error)
    return NextResponse.json(
      { error: 'Failed to create bug report' },
      { status: 500 }
    )
  }
}

// GET /api/bug-reports - Get current user's bug reports
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reports = await prisma.bug_reports.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        created_at: true,
        page_url: true,
      }
    })

    return NextResponse.json(reports)
  } catch (error) {
    console.error('Failed to fetch bug reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bug reports' },
      { status: 500 }
    )
  }
}
