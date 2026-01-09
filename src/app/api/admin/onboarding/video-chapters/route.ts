import { NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'

// GET - Fetch all video chapters
export async function GET() {
  try {
    const result = await dbPool.query(`
      SELECT id, title, description, video_url, sort_order
      FROM onboarding_video_chapters
      WHERE is_active = true
      ORDER BY sort_order ASC
    `)

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching video chapters:', error)
    return NextResponse.json({ error: 'Failed to fetch video chapters' }, { status: 500 })
  }
}

// POST - Create a new chapter
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, description, videoUrl } = body

    // Get max sort_order
    const maxResult = await dbPool.query('SELECT COALESCE(MAX(sort_order), -1) as max_order FROM onboarding_video_chapters')
    const nextOrder = maxResult.rows[0].max_order + 1

    const result = await dbPool.query(`
      INSERT INTO onboarding_video_chapters (title, description, video_url, sort_order)
      VALUES ($1, $2, $3, $4)
      RETURNING id, title, description, video_url, sort_order
    `, [title || 'New Chapter', description || '', videoUrl || null, nextOrder])

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error creating video chapter:', error)
    return NextResponse.json({ error: 'Failed to create video chapter' }, { status: 500 })
  }
}

// PUT - Update all chapters (for reordering and bulk updates)
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { chapters } = body

    // Update each chapter
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i]
      await dbPool.query(`
        UPDATE onboarding_video_chapters
        SET title = $1, description = $2, video_url = $3, sort_order = $4, updated_at = now()
        WHERE id = $5
      `, [chapter.title, chapter.description, chapter.videoUrl || null, i, chapter.id])
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating video chapters:', error)
    return NextResponse.json({ error: 'Failed to update video chapters' }, { status: 500 })
  }
}

// PATCH - Update a single chapter
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, title, description, videoUrl } = body

    const result = await dbPool.query(`
      UPDATE onboarding_video_chapters
      SET title = $1, description = $2, video_url = $3, updated_at = now()
      WHERE id = $4
      RETURNING id, title, description, video_url, sort_order
    `, [title, description, videoUrl || null, id])

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error updating video chapter:', error)
    return NextResponse.json({ error: 'Failed to update video chapter' }, { status: 500 })
  }
}

// DELETE - Delete a chapter
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Chapter ID required' }, { status: 400 })
    }

    await dbPool.query('DELETE FROM onboarding_video_chapters WHERE id = $1', [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting video chapter:', error)
    return NextResponse.json({ error: 'Failed to delete video chapter' }, { status: 500 })
  }
}
