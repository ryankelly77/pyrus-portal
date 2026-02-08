import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { getPipelineData } from '@/lib/pipeline/get-pipeline-data';
import type { PipelineFilters } from '@/lib/pipeline/pipeline-view-types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);

    // Parse filters from query params
    const filters: PipelineFilters = {};

    const repId = searchParams.get('rep_id');
    if (repId) {
      filters.rep_id = repId;
    }

    const tier = searchParams.get('predicted_tier');
    if (tier && ['good', 'better', 'best'].includes(tier)) {
      filters.predicted_tier = tier as 'good' | 'better' | 'best';
    }

    const sentAfter = searchParams.get('sent_after');
    if (sentAfter) {
      filters.sent_after = sentAfter;
    }

    const sentBefore = searchParams.get('sent_before');
    if (sentBefore) {
      filters.sent_before = sentBefore;
    }

    const archived = searchParams.get('archived');
    if (archived && ['active', 'archived', 'all'].includes(archived)) {
      filters.archived = archived as 'active' | 'archived' | 'all';
    }

    const data = await getPipelineData(filters);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch pipeline data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline data' },
      { status: 500 }
    );
  }
}
