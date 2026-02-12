// ============================================================
// Archive Analytics API
// ============================================================
//
// GET - Fetch analytics on archived deals grouped by reason
// ============================================================

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { getArchiveAnalytics } from '@/lib/pipeline/get-pipeline-data';
import type { ArchiveAnalyticsFilters } from '@/lib/pipeline/get-pipeline-data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { profile } = auth;

    // Check role
    if (!['admin', 'super_admin', 'sales'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Parse filters from query params
    const filters: ArchiveAnalyticsFilters = {};

    const archivedAfter = searchParams.get('archived_after');
    if (archivedAfter) {
      filters.archived_after = archivedAfter;
    }

    const archivedBefore = searchParams.get('archived_before');
    if (archivedBefore) {
      filters.archived_before = archivedBefore;
    }

    // Sales users can only see their own deals
    if (profile.role === 'sales') {
      filters.rep_id = auth.user.id;
    } else {
      const repId = searchParams.get('rep_id');
      if (repId) {
        filters.rep_id = repId;
      }
    }

    const analytics = await getArchiveAnalytics(filters);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Failed to fetch archive analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch archive analytics' },
      { status: 500 }
    );
  }
}
