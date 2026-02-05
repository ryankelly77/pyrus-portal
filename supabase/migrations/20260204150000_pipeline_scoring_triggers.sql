-- ============================================================
-- Pipeline Scoring: Database Triggers for Score Recalculation
-- ============================================================
--
-- These triggers automatically queue score recalculations when
-- relevant data changes outside of API calls (direct DB updates,
-- HighLevel webhooks, etc).
--
-- Implementation:
--   1. Create a function to queue recalculation
--   2. Create triggers on relevant tables
--   3. (Optional) Use pg_net for async API calls if available
--
-- Note: For simpler deployments, you can replace API calls with
-- a cron job that rescores all active deals daily.
-- ============================================================


-- ============================================================
-- 1. Utility function to log recalculation events
-- ============================================================
--
-- This provides an audit trail of what triggered recalculations.
-- The actual recalculation is handled by the daily cron job or
-- API calls from webhooks.
--

CREATE TABLE IF NOT EXISTS public.pipeline_score_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recommendation_id uuid NOT NULL,
  event_type text NOT NULL,
  triggered_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,

  CONSTRAINT pipeline_score_events_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_score_events_recommendation
  ON public.pipeline_score_events (recommendation_id, triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_score_events_unprocessed
  ON public.pipeline_score_events (processed_at)
  WHERE processed_at IS NULL;


-- ============================================================
-- 2. Function to queue score recalculation
-- ============================================================

CREATE OR REPLACE FUNCTION public.queue_score_recalculation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recommendation_id uuid;
  v_event_type text;
BEGIN
  -- Determine recommendation_id and event_type based on trigger source
  CASE TG_TABLE_NAME
    WHEN 'recommendation_invites' THEN
      v_recommendation_id := COALESCE(NEW.recommendation_id, OLD.recommendation_id);

      IF TG_OP = 'INSERT' THEN
        v_event_type := 'invite_created';
      ELSIF TG_OP = 'UPDATE' THEN
        -- Determine what changed
        IF NEW.email_opened_at IS DISTINCT FROM OLD.email_opened_at AND NEW.email_opened_at IS NOT NULL THEN
          v_event_type := 'email_opened';
        ELSIF NEW.account_created_at IS DISTINCT FROM OLD.account_created_at AND NEW.account_created_at IS NOT NULL THEN
          v_event_type := 'account_created';
        ELSIF NEW.viewed_at IS DISTINCT FROM OLD.viewed_at AND NEW.viewed_at IS NOT NULL THEN
          v_event_type := 'proposal_viewed';
        ELSE
          v_event_type := 'invite_updated';
        END IF;
      END IF;

    WHEN 'recommendation_call_scores' THEN
      v_recommendation_id := COALESCE(NEW.recommendation_id, OLD.recommendation_id);
      v_event_type := CASE TG_OP
        WHEN 'INSERT' THEN 'call_scores_created'
        WHEN 'UPDATE' THEN 'call_scores_updated'
        WHEN 'DELETE' THEN 'call_scores_deleted'
      END;

    WHEN 'recommendation_communications' THEN
      v_recommendation_id := COALESCE(NEW.recommendation_id, OLD.recommendation_id);
      v_event_type := 'communication_' || COALESCE(NEW.direction, OLD.direction);

    WHEN 'recommendations' THEN
      v_recommendation_id := COALESCE(NEW.id, OLD.id);

      IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
        v_event_type := 'status_changed_to_' || NEW.status;
      ELSIF TG_OP = 'UPDATE' THEN
        v_event_type := 'recommendation_updated';
      END IF;

    ELSE
      RETURN COALESCE(NEW, OLD);
  END CASE;

  -- Skip if we couldn't determine the recommendation_id or event
  IF v_recommendation_id IS NULL OR v_event_type IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Insert event into queue (dedupe within 1 second)
  INSERT INTO public.pipeline_score_events (recommendation_id, event_type)
  SELECT v_recommendation_id, v_event_type
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_score_events
    WHERE recommendation_id = v_recommendation_id
      AND event_type = v_event_type
      AND triggered_at > now() - interval '1 second'
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;


-- ============================================================
-- 3. Create triggers on relevant tables
-- ============================================================

-- Triggers on recommendation_invites
DROP TRIGGER IF EXISTS trg_score_invite_insert ON public.recommendation_invites;
CREATE TRIGGER trg_score_invite_insert
  AFTER INSERT ON public.recommendation_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_score_recalculation();

DROP TRIGGER IF EXISTS trg_score_invite_update ON public.recommendation_invites;
CREATE TRIGGER trg_score_invite_update
  AFTER UPDATE OF email_opened_at, account_created_at, viewed_at
  ON public.recommendation_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_score_recalculation();

-- Triggers on recommendation_call_scores
DROP TRIGGER IF EXISTS trg_score_call_scores ON public.recommendation_call_scores;
CREATE TRIGGER trg_score_call_scores
  AFTER INSERT OR UPDATE OR DELETE ON public.recommendation_call_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_score_recalculation();

-- Triggers on recommendation_communications
DROP TRIGGER IF EXISTS trg_score_communications ON public.recommendation_communications;
CREATE TRIGGER trg_score_communications
  AFTER INSERT ON public.recommendation_communications
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_score_recalculation();

-- Trigger on recommendations (status changes)
DROP TRIGGER IF EXISTS trg_score_recommendation_status ON public.recommendations;
CREATE TRIGGER trg_score_recommendation_status
  AFTER UPDATE OF status ON public.recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_score_recalculation();


-- ============================================================
-- 4. Function to process queued score events
-- ============================================================
--
-- Call this from a cron job or scheduled function.
-- Returns the number of recommendations processed.
--

CREATE OR REPLACE FUNCTION public.process_score_event_queue()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer := 0;
  v_rec_id uuid;
  v_rec_ids uuid[];
BEGIN
  -- Get distinct recommendation IDs with unprocessed events
  SELECT ARRAY_AGG(DISTINCT recommendation_id)
  INTO v_rec_ids
  FROM public.pipeline_score_events
  WHERE processed_at IS NULL;

  IF v_rec_ids IS NULL OR array_length(v_rec_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  -- Mark events as processed
  UPDATE public.pipeline_score_events
  SET processed_at = now()
  WHERE processed_at IS NULL;

  RETURN array_length(v_rec_ids, 1);
END;
$$;


-- ============================================================
-- 5. RLS policies for score events table
-- ============================================================

ALTER TABLE public.pipeline_score_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view score events"
  ON public.pipeline_score_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "System can insert score events"
  ON public.pipeline_score_events
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update score events"
  ON public.pipeline_score_events
  FOR UPDATE
  USING (true);


-- ============================================================
-- 6. Cleanup old events (keep last 30 days)
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_score_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.pipeline_score_events
  WHERE triggered_at < now() - interval '30 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;


-- ============================================================
-- 7. Pipeline scoring runs log table (audit history)
-- ============================================================
--
-- Logs each execution of the batch recalculation job.
-- Useful for monitoring and debugging scoring issues.
--

CREATE TABLE IF NOT EXISTS public.pipeline_scoring_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  run_type text NOT NULL CHECK (run_type IN ('daily_cron', 'event_queue', 'manual')),
  processed integer NOT NULL DEFAULT 0,
  succeeded integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,

  CONSTRAINT pipeline_scoring_runs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_scoring_runs_completed
  ON public.pipeline_scoring_runs (completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_scoring_runs_type
  ON public.pipeline_scoring_runs (run_type, completed_at DESC);

-- RLS for scoring runs (admin only)
ALTER TABLE public.pipeline_scoring_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view scoring runs"
  ON public.pipeline_scoring_runs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "System can insert scoring runs"
  ON public.pipeline_scoring_runs
  FOR INSERT
  WITH CHECK (true);


-- ============================================================
-- 8. Cleanup old scoring runs (keep last 90 days)
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_scoring_runs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.pipeline_scoring_runs
  WHERE completed_at < now() - interval '90 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
