import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string; historyId: string }>
}

// DELETE /api/admin/clients/[id]/smart-recommendations/history/[historyId]
// Delete a recommendation history item (super_admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is super_admin
    const profileResult = await dbPool.query(
      `SELECT role FROM profiles WHERE id = $1`,
      [user.id]
    )

    if (profileResult.rows[0]?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admins can delete history items' },
        { status: 403 }
      )
    }

    const { id: clientId, historyId } = await params

    // Verify the history item belongs to this client's recommendation
    const historyResult = await dbPool.query(
      `SELECT srh.id
       FROM smart_recommendation_history srh
       JOIN smart_recommendations sr ON sr.id = srh.recommendation_id
       WHERE srh.id = $1 AND sr.client_id = $2`,
      [historyId, clientId]
    )

    if (historyResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'History item not found' },
        { status: 404 }
      )
    }

    // Delete the history item
    await dbPool.query(
      `DELETE FROM smart_recommendation_history WHERE id = $1`,
      [historyId]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting history item:', error)
    return NextResponse.json(
      { error: 'Failed to delete history item' },
      { status: 500 }
    )
  }
}
