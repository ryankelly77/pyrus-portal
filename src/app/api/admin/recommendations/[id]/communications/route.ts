// ============================================================
// Recommendation Communications API
// ============================================================
//
// Logs communication events for a specific recommendation/deal.
// Used for tracking prospect interactions that affect the silence penalty.
//
// Sources:
//   - manual: Rep manually logs a call/meeting
//   - highlevel_webhook: Automatic from HighLevel
//   - system: System-generated events
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma, dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { triggerRecalculation } from '@/lib/pipeline/recalculate-score'

export const dynamic = 'force-dynamic'

type Direction = 'inbound' | 'outbound'
type Channel = 'email' | 'sms' | 'chat' | 'call' | 'other'
type Source = 'highlevel_webhook' | 'manual' | 'system'

const VALID_DIRECTIONS: Direction[] = ['inbound', 'outbound']
const VALID_CHANNELS: Channel[] = ['email', 'sms', 'chat', 'call', 'other']
const VALID_SOURCES: Source[] = ['highlevel_webhook', 'manual', 'system']

// GET /api/admin/recommendations/[id]/communications
// Returns all communications for a recommendation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    const result = await dbPool.query(
      `SELECT
        id,
        recommendation_id,
        direction,
        channel,
        contact_at,
        source,
        highlevel_message_id,
        notes,
        created_at
       FROM recommendation_communications
       WHERE recommendation_id = $1
       ORDER BY contact_at DESC`,
      [id]
    )

    const communications = result.rows.map(row => ({
      id: row.id,
      recommendationId: row.recommendation_id,
      direction: row.direction,
      channel: row.channel,
      contactAt: row.contact_at,
      source: row.source,
      highlevelMessageId: row.highlevel_message_id,
      notes: row.notes,
      createdAt: row.created_at,
    }))

    return NextResponse.json({ communications })
  } catch (error) {
    console.error('Failed to fetch communications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch communications' },
      { status: 500 }
    )
  }
}

// POST /api/admin/recommendations/[id]/communications
// Logs a new communication event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await request.json()
    const {
      direction,
      channel,
      contactAt,
      source = 'manual',
      highlevelMessageId,
      notes,
    } = body as {
      direction: Direction
      channel: Channel
      contactAt?: string
      source?: Source
      highlevelMessageId?: string
      notes?: string
    }

    // Validate inputs
    if (!VALID_DIRECTIONS.includes(direction)) {
      return NextResponse.json(
        { error: `Invalid direction. Must be one of: ${VALID_DIRECTIONS.join(', ')}` },
        { status: 400 }
      )
    }
    if (!VALID_CHANNELS.includes(channel)) {
      return NextResponse.json(
        { error: `Invalid channel. Must be one of: ${VALID_CHANNELS.join(', ')}` },
        { status: 400 }
      )
    }
    if (!VALID_SOURCES.includes(source)) {
      return NextResponse.json(
        { error: `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify recommendation exists
    const rec = await prisma.recommendations.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!rec) {
      return NextResponse.json(
        { error: 'Recommendation not found' },
        { status: 404 }
      )
    }

    // Check for duplicate HighLevel message
    if (highlevelMessageId) {
      const existing = await dbPool.query(
        `SELECT id FROM recommendation_communications WHERE highlevel_message_id = $1`,
        [highlevelMessageId]
      )
      if (existing.rows.length > 0) {
        return NextResponse.json(
          { error: 'Communication already logged', existingId: existing.rows[0].id },
          { status: 409 }
        )
      }
    }

    // Insert communication
    const result = await dbPool.query(
      `INSERT INTO recommendation_communications
        (recommendation_id, direction, channel, contact_at, source, highlevel_message_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, recommendation_id, direction, channel, contact_at, source, highlevel_message_id, notes, created_at`,
      [
        id,
        direction,
        channel,
        contactAt ? new Date(contactAt) : new Date(),
        source,
        highlevelMessageId || null,
        notes || null,
      ]
    )

    const comm = result.rows[0]

    // Trigger score recalculation (inbound communication affects silence penalty)
    triggerRecalculation(id, 'communication_logged').catch(console.error)

    return NextResponse.json({
      communication: {
        id: comm.id,
        recommendationId: comm.recommendation_id,
        direction: comm.direction,
        channel: comm.channel,
        contactAt: comm.contact_at,
        source: comm.source,
        highlevelMessageId: comm.highlevel_message_id,
        notes: comm.notes,
        createdAt: comm.created_at,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to log communication:', error)
    return NextResponse.json(
      { error: 'Failed to log communication' },
      { status: 500 }
    )
  }
}
