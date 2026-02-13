import { NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

// Default tutorial pages for initial seeding
const defaultTutorialPages = [
  { id: 'dashboard', title: 'Dashboard', description: 'Overview of the admin dashboard' },
  { id: 'clients', title: 'Clients', description: 'Managing client accounts and settings' },
  { id: 'content', title: 'Content', description: 'Content creation and approval workflow' },
  { id: 'websites', title: 'Websites', description: 'Website management and edit requests' },
  { id: 'recommendations', title: 'Recommendations', description: 'Smart recommendations system' },
  { id: 'products', title: 'Products', description: 'Product catalog management' },
  { id: 'emails', title: 'Emails', description: 'Email templates and automation' },
  { id: 'users', title: 'Users', description: 'User management and permissions' },
  { id: 'revenue', title: 'Revenue & Pipeline', description: 'Revenue tracking and sales pipeline' },
  { id: 'settings', title: 'Settings', description: 'System settings and configuration' },
]

// GET - Fetch all tutorial pages
export async function GET() {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    // Check if table exists and has data
    try {
      const result = await dbPool.query(`
        SELECT id, title, description, video_url, sort_order
        FROM tutorial_videos
        WHERE is_active = true
        ORDER BY sort_order ASC
      `)

      if (result.rows.length === 0) {
        // Seed default pages
        for (let i = 0; i < defaultTutorialPages.length; i++) {
          const page = defaultTutorialPages[i]
          await dbPool.query(`
            INSERT INTO tutorial_videos (id, title, description, sort_order)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO NOTHING
          `, [page.id, page.title, page.description, i])
        }

        // Fetch again after seeding
        const seededResult = await dbPool.query(`
          SELECT id, title, description, video_url, sort_order
          FROM tutorial_videos
          WHERE is_active = true
          ORDER BY sort_order ASC
        `)
        return NextResponse.json(seededResult.rows)
      }

      return NextResponse.json(result.rows)
    } catch (tableError: any) {
      // Table might not exist - create it
      if (tableError.code === '42P01') {
        await dbPool.query(`
          CREATE TABLE IF NOT EXISTS tutorial_videos (
            id VARCHAR(50) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            video_url TEXT,
            sort_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          )
        `)

        // Seed default pages
        for (let i = 0; i < defaultTutorialPages.length; i++) {
          const page = defaultTutorialPages[i]
          await dbPool.query(`
            INSERT INTO tutorial_videos (id, title, description, sort_order)
            VALUES ($1, $2, $3, $4)
          `, [page.id, page.title, page.description, i])
        }

        const result = await dbPool.query(`
          SELECT id, title, description, video_url, sort_order
          FROM tutorial_videos
          WHERE is_active = true
          ORDER BY sort_order ASC
        `)
        return NextResponse.json(result.rows)
      }
      throw tableError
    }
  } catch (error) {
    console.error('Error fetching tutorial pages:', error)
    return NextResponse.json({ error: 'Failed to fetch tutorial pages' }, { status: 500 })
  }
}

// POST - Create a new tutorial page
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { title, description, videoUrl } = body

    // Generate ID from title
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    // Get max sort_order
    const maxResult = await dbPool.query('SELECT COALESCE(MAX(sort_order), -1) as max_order FROM tutorial_videos')
    const nextOrder = maxResult.rows[0].max_order + 1

    const result = await dbPool.query(`
      INSERT INTO tutorial_videos (id, title, description, video_url, sort_order)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, title, description, video_url, sort_order
    `, [id, title || 'New Page', description || '', videoUrl || null, nextOrder])

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error creating tutorial page:', error)
    return NextResponse.json({ error: 'Failed to create tutorial page' }, { status: 500 })
  }
}

// PUT - Update all pages (for reordering)
export async function PUT(request: Request) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { pages } = body

    // Update each page
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      await dbPool.query(`
        UPDATE tutorial_videos
        SET title = $1, description = $2, video_url = $3, sort_order = $4, updated_at = now()
        WHERE id = $5
      `, [page.title, page.description, page.videoUrl || null, i, page.id])
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating tutorial pages:', error)
    return NextResponse.json({ error: 'Failed to update tutorial pages' }, { status: 500 })
  }
}

// PATCH - Update a single page
export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { id, title, description, videoUrl } = body

    const result = await dbPool.query(`
      UPDATE tutorial_videos
      SET title = $1, description = $2, video_url = $3, updated_at = now()
      WHERE id = $4
      RETURNING id, title, description, video_url, sort_order
    `, [title, description, videoUrl || null, id])

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error updating tutorial page:', error)
    return NextResponse.json({ error: 'Failed to update tutorial page' }, { status: 500 })
  }
}

// DELETE - Delete a page
export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Page ID required' }, { status: 400 })
    }

    await dbPool.query('DELETE FROM tutorial_videos WHERE id = $1', [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tutorial page:', error)
    return NextResponse.json({ error: 'Failed to delete tutorial page' }, { status: 500 })
  }
}
