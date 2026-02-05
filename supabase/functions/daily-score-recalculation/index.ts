// ============================================================
// Supabase Edge Function: Daily Score Recalculation
// ============================================================
//
// Alternative to Vercel cron for running the daily pipeline
// score recalculation job.
//
// Deploy: supabase functions deploy daily-score-recalculation
//
// Schedule via SQL:
//   SELECT cron.schedule(
//     'daily-pipeline-score-recalc',
//     '0 6 * * *',
//     $$SELECT net.http_post(
//       url := 'https://<project-ref>.supabase.co/functions/v1/daily-score-recalculation',
//       headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
//       body := '{}'::jsonb
//     );$$
//   );
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const BATCH_SIZE = 25;
const BATCH_DELAY_MS = 200;

interface ScoringResult {
  confidence_score: number;
  confidence_percent: number;
  weighted_monthly: number;
  weighted_onetime: number;
}

interface BatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  duration_ms: number;
  errors: Array<{ recommendation_id: string; error: string }>;
}

// Get Supabase client with service role
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
}

// Simple delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Calculate score for a single recommendation (simplified version)
async function calculateAndWriteScore(
  supabase: ReturnType<typeof getSupabaseClient>,
  recommendationId: string
): Promise<ScoringResult | null> {
  // Fetch recommendation data
  const { data: recommendation, error: recError } = await supabase
    .from('recommendations')
    .select('id, status, sent_at, predicted_monthly, predicted_onetime')
    .eq('id', recommendationId)
    .single();

  if (recError || !recommendation) {
    throw new Error(`Failed to fetch recommendation: ${recError?.message}`);
  }

  // Skip terminal statuses
  if (recommendation.status === 'accepted' || recommendation.status === 'closed_lost') {
    return null;
  }

  // Fetch call scores
  const { data: callScores } = await supabase
    .from('recommendation_call_scores')
    .select('budget_clarity, competition, engagement, plan_fit')
    .eq('recommendation_id', recommendationId)
    .single();

  // Fetch invite data for milestones
  const { data: invites } = await supabase
    .from('recommendation_invites')
    .select('email_opened_at, account_created_at, viewed_at')
    .eq('recommendation_id', recommendationId);

  // Fetch communications
  const { data: comms } = await supabase
    .from('recommendation_communications')
    .select('direction, contact_at')
    .eq('recommendation_id', recommendationId)
    .order('contact_at', { ascending: false });

  // Fetch config
  const { data: configRow } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'pipeline_scoring_config')
    .single();

  // Default config values
  const config = configRow?.value || {
    call_weights: { budget_clarity: 25, competition: 20, engagement: 25, plan_fit: 30 },
    call_score_mappings: {
      budget_clarity: { clear: 1.0, vague: 0.5, none: 0.2, no_budget: 0 },
      competition: { none: 1.0, some: 0.5, many: 0.15 },
      engagement: { high: 1.0, medium: 0.55, low: 0.15 },
      plan_fit: { strong: 1.0, medium: 0.6, weak: 0.25, poor: 0 },
    },
    penalties: {
      email_not_opened: { grace_period_hours: 24, daily_penalty: 2.5, max_penalty: 35 },
      proposal_not_viewed: { grace_period_hours: 48, daily_penalty: 2, max_penalty: 25 },
      silence: { grace_period_days: 5, daily_penalty: 3, max_penalty: 80 },
    },
    default_base_score: 50,
  };

  const now = new Date();
  const MS_PER_HOUR = 1000 * 60 * 60;
  const MS_PER_DAY = MS_PER_HOUR * 24;

  // Calculate base score
  let baseScore = config.default_base_score;
  if (callScores) {
    const weights = config.call_weights;
    const mappings = config.call_score_mappings;
    baseScore =
      (mappings.budget_clarity[callScores.budget_clarity] ?? 0) * weights.budget_clarity +
      (mappings.competition[callScores.competition] ?? 0) * weights.competition +
      (mappings.engagement[callScores.engagement] ?? 0) * weights.engagement +
      (mappings.plan_fit[callScores.plan_fit] ?? 0) * weights.plan_fit;
  }

  // Calculate email not opened penalty
  let emailPenalty = 0;
  const emailOpenedDates = (invites || []).map(i => i.email_opened_at).filter(Boolean);
  if (emailOpenedDates.length === 0 && recommendation.sent_at) {
    const sentTime = new Date(recommendation.sent_at).getTime();
    const hoursElapsed = (now.getTime() - sentTime) / MS_PER_HOUR;
    const graceHours = config.penalties.email_not_opened.grace_period_hours || 24;
    if (hoursElapsed > graceHours) {
      const daysPastGrace = (hoursElapsed - graceHours) / 24;
      emailPenalty = Math.min(
        daysPastGrace * config.penalties.email_not_opened.daily_penalty,
        config.penalties.email_not_opened.max_penalty
      );
    }
  }

  // Calculate proposal not viewed penalty
  let viewPenalty = 0;
  const viewedDates = (invites || []).map(i => i.viewed_at).filter(Boolean);
  if (viewedDates.length === 0) {
    const anchors = [
      ...(invites || []).map(i => i.email_opened_at).filter(Boolean),
      ...(invites || []).map(i => i.account_created_at).filter(Boolean),
    ];
    if (anchors.length > 0) {
      const earliest = anchors.sort()[0];
      const anchorTime = new Date(earliest).getTime();
      const hoursElapsed = (now.getTime() - anchorTime) / MS_PER_HOUR;
      const graceHours = config.penalties.proposal_not_viewed.grace_period_hours || 48;
      if (hoursElapsed > graceHours) {
        const daysPastGrace = (hoursElapsed - graceHours) / 24;
        viewPenalty = Math.min(
          daysPastGrace * config.penalties.proposal_not_viewed.daily_penalty,
          config.penalties.proposal_not_viewed.max_penalty
        );
      }
    }
  }

  // Calculate silence penalty
  let silencePenalty = 0;
  if (recommendation.sent_at) {
    const inboundComms = (comms || []).filter(c => c.direction === 'inbound');
    const anchor = inboundComms.length > 0 ? inboundComms[0].contact_at : recommendation.sent_at;
    const anchorTime = new Date(anchor).getTime();
    const daysElapsed = Math.floor((now.getTime() - anchorTime) / MS_PER_DAY);
    const graceDays = config.penalties.silence.grace_period_days || 5;
    if (daysElapsed > graceDays) {
      const daysPastGrace = daysElapsed - graceDays;
      silencePenalty = Math.min(
        daysPastGrace * config.penalties.silence.daily_penalty,
        config.penalties.silence.max_penalty
      );
    }
  }

  // Calculate final score
  const totalPenalties = emailPenalty + viewPenalty + silencePenalty;
  const rawScore = baseScore - totalPenalties;
  const finalScore = Math.round(Math.max(0, Math.min(100, rawScore)));
  const confidencePercent = Math.round(finalScore) / 100;
  const weightedMonthly = Math.round((Number(recommendation.predicted_monthly) || 0) * confidencePercent * 100) / 100;
  const weightedOnetime = Math.round((Number(recommendation.predicted_onetime) || 0) * confidencePercent * 100) / 100;

  // Write score back
  const { error: updateError } = await supabase
    .from('recommendations')
    .update({
      confidence_score: finalScore,
      confidence_percent: confidencePercent,
      weighted_monthly: weightedMonthly,
      weighted_onetime: weightedOnetime,
      last_scored_at: now.toISOString(),
    })
    .eq('id', recommendationId);

  if (updateError) {
    throw new Error(`Failed to write score: ${updateError.message}`);
  }

  return {
    confidence_score: finalScore,
    confidence_percent: confidencePercent,
    weighted_monthly: weightedMonthly,
    weighted_onetime: weightedOnetime,
  };
}

// Process stale recommendations in batches
async function batchRecalculateStaleScores(supabase: ReturnType<typeof getSupabaseClient>): Promise<BatchResult> {
  const startTime = Date.now();
  const errors: Array<{ recommendation_id: string; error: string }> = [];
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  // Get stale recommendations (not scored in 23+ hours)
  const { data: recommendations, error: fetchError } = await supabase
    .from('recommendations')
    .select('id')
    .in('status', ['sent', 'declined'])
    .or('last_scored_at.is.null,last_scored_at.lt.' + new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString())
    .order('last_scored_at', { ascending: true, nullsFirst: true });

  if (fetchError) {
    throw new Error(`Failed to fetch recommendations: ${fetchError.message}`);
  }

  const ids = (recommendations || []).map(r => r.id);
  console.log(`[Edge Function] Found ${ids.length} stale recommendations`);

  if (ids.length === 0) {
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      duration_ms: Date.now() - startTime,
      errors: [],
    };
  }

  // Process in batches
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    console.log(`[Edge Function] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(ids.length / BATCH_SIZE)}`);

    await Promise.all(
      batch.map(async (id) => {
        try {
          const result = await calculateAndWriteScore(supabase, id);
          if (result === null) {
            skipped++;
          } else {
            succeeded++;
          }
        } catch (error) {
          failed++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push({ recommendation_id: id, error: errorMsg });
          console.error(`[Edge Function] Failed to recalculate ${id}:`, errorMsg);
        }
      })
    );

    // Delay between batches
    if (i + BATCH_SIZE < ids.length) {
      await delay(BATCH_DELAY_MS);
    }
  }

  return {
    processed: ids.length,
    succeeded,
    failed,
    skipped,
    duration_ms: Date.now() - startTime,
    errors,
  };
}

// Log scoring run to audit table
async function logScoringRun(
  supabase: ReturnType<typeof getSupabaseClient>,
  runType: string,
  result: BatchResult
): Promise<void> {
  try {
    await supabase.from('pipeline_scoring_runs').insert({
      run_type: runType,
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      skipped: result.skipped,
      duration_ms: result.duration_ms,
      errors: result.errors.slice(0, 50),
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Edge Function] Failed to log scoring run:', error);
  }
}

// Main handler
serve(async (req) => {
  const startTime = Date.now();

  // Verify authorization
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('[Edge Function] Starting daily score recalculation...');
    const supabase = getSupabaseClient();

    // Process queued events first
    const { data: events } = await supabase
      .from('pipeline_score_events')
      .select('recommendation_id')
      .is('processed_at', null);

    let queueResult: BatchResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      duration_ms: 0,
      errors: [],
    };

    if (events && events.length > 0) {
      const eventIds = [...new Set(events.map(e => e.recommendation_id))];
      console.log(`[Edge Function] Processing ${eventIds.length} queued events`);

      const eventStartTime = Date.now();
      for (const id of eventIds) {
        try {
          const result = await calculateAndWriteScore(supabase, id);
          if (result === null) {
            queueResult.skipped++;
          } else {
            queueResult.succeeded++;
          }
        } catch (error) {
          queueResult.failed++;
          queueResult.errors.push({
            recommendation_id: id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      queueResult.processed = eventIds.length;
      queueResult.duration_ms = Date.now() - eventStartTime;

      // Mark events as processed
      await supabase
        .from('pipeline_score_events')
        .update({ processed_at: new Date().toISOString() })
        .is('processed_at', null);

      await logScoringRun(supabase, 'event_queue', queueResult);
    }

    // Recalculate stale scores
    const staleResult = await batchRecalculateStaleScores(supabase);
    await logScoringRun(supabase, 'daily_cron', staleResult);

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      total_duration_ms: Date.now() - startTime,
      queue: {
        processed: queueResult.processed,
        succeeded: queueResult.succeeded,
        failed: queueResult.failed,
        skipped: queueResult.skipped,
      },
      stale: {
        processed: staleResult.processed,
        succeeded: staleResult.succeeded,
        failed: staleResult.failed,
        skipped: staleResult.skipped,
      },
    };

    console.log('[Edge Function] Completed:', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Edge Function] Failed:', errorMsg);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
