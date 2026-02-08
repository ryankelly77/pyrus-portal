import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { getStripeMRRData } from '@/lib/stripe-mrr-cache';
import { getPipelineRevenueSummary } from '@/lib/pipeline/get-pipeline-revenue-summary';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    // Get cached Stripe data
    const stripeData = await getStripeMRRData();

    // Get pipeline revenue summary
    const summary = await getPipelineRevenueSummary(
      stripeData.currentMRR,
      stripeData.activeClientCount
    );

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Failed to fetch pipeline revenue summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline revenue summary' },
      { status: 500 }
    );
  }
}
