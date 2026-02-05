// ============================================================
// Track Account Created for Pipeline Scoring
// ============================================================
//
// Called when a user registers with an invite token.
// Updates account_created_at on the invite record.
// This is a fire-and-forget call from the registration flow.
//

import { NextResponse } from 'next/server';
import { dbPool } from '@/lib/prisma';
import { triggerRecalculation } from '@/lib/pipeline/recalculate-score';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { inviteToken } = body;

    if (!inviteToken) {
      return NextResponse.json({ error: 'Missing inviteToken' }, { status: 400 });
    }

    // Find the invite by token and update account_created_at
    const result = await dbPool.query(
      `UPDATE recommendation_invites
       SET account_created_at = NOW()
       WHERE invite_token = $1
         AND account_created_at IS NULL
       RETURNING id, recommendation_id`,
      [inviteToken]
    );

    if (result.rowCount === 0) {
      // Either token not found or already tracked - both are acceptable
      return NextResponse.json({ success: true, updated: false });
    }

    const { recommendation_id } = result.rows[0];

    // Trigger score recalculation for this recommendation
    if (recommendation_id) {
      triggerRecalculation(recommendation_id, 'account_created').catch((err) => {
        console.error('[track-account-created] Recalculation failed:', err);
      });
    }

    return NextResponse.json({ success: true, updated: true });
  } catch (error) {
    console.error('[track-account-created] Error:', error);
    // Return success anyway - this is fire-and-forget from registration
    // We don't want to block or show errors during signup
    return NextResponse.json({ success: true, error: 'Internal error' });
  }
}
