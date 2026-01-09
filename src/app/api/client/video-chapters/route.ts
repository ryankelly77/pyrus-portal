import { NextResponse } from 'next/server'
import { Pool } from 'pg'

async function getPool() {
  const connectionString = process.env.DATABASE_URL
  return new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
}

// GET - Fetch all active video chapters (client-facing, no auth required)
export async function GET() {
  const pool = await getPool()

  try {
    const result = await pool.query(`
      SELECT id, title, description, video_url, sort_order
      FROM onboarding_video_chapters
      WHERE is_active = true
      ORDER BY sort_order ASC
    `)

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching video chapters:', error)
    return NextResponse.json({ error: 'Failed to fetch video chapters' }, { status: 500 })
  } finally {
    await pool.end()
  }
}
