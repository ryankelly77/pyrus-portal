import { NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'

// GET - Fetch all active video chapters (client-facing, no auth required)
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
