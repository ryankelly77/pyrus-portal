import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { getWebsiteData } from '@/lib/services/websiteService'

export const dynamic = 'force-dynamic'

// GET /api/admin/clients/[id]/website - Get website data for a client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { id: clientId } = await params

    // Get website data using shared service
    const websiteData = await getWebsiteData(clientId)

    return NextResponse.json(websiteData)
  } catch (error) {
    console.error('Failed to fetch website data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch website data' },
      { status: 500 }
    )
  }
}
