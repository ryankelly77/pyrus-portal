-- Email Automations (defines sequences)
CREATE TABLE email_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,

  -- Trigger
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'proposal_sent',
    'client_created',
    'content_approved',
    'invoice_sent',
    'manual'
  )),
  trigger_conditions JSONB DEFAULT '{}',

  -- Stop conditions (checked before each step)
  global_stop_conditions JSONB DEFAULT '{}',
  -- Example: {"or": [{"email_opened": true}, {"proposal_viewed": true}, {"deal_status": ["closed_won", "closed_lost"]}]}

  -- Send window (only send during these hours)
  send_window_start TIME DEFAULT '09:00',
  send_window_end TIME DEFAULT '17:00',
  send_window_timezone TEXT DEFAULT 'America/Chicago',
  send_on_weekends BOOLEAN DEFAULT false,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automation Steps (individual emails in sequence)
CREATE TABLE email_automation_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES email_automations(id) ON DELETE CASCADE,

  step_order INTEGER NOT NULL,

  -- Delay before this step
  delay_days INTEGER DEFAULT 0,
  delay_hours INTEGER DEFAULT 0,
  delay_from TEXT DEFAULT 'previous_step' CHECK (delay_from IN ('trigger', 'previous_step')),

  -- Email to send
  template_slug TEXT NOT NULL REFERENCES email_templates(slug),
  subject_override TEXT, -- Optional override of template subject

  -- Conditions for this specific step
  send_conditions JSONB DEFAULT '{}', -- Must be true to send
  skip_conditions JSONB DEFAULT '{}', -- Skip if true (move to next step)

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(automation_id, step_order)
);

-- Enrollment tracking (who is in which automation)
CREATE TABLE email_automation_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES email_automations(id) ON DELETE CASCADE,

  -- Who/what triggered this
  trigger_record_type TEXT NOT NULL, -- 'recommendation_invite', 'client', etc.
  trigger_record_id UUID NOT NULL,

  -- Recipient
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,

  -- Context data (variables available to templates)
  context_data JSONB DEFAULT '{}',

  -- Progress
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'stopped', 'paused')),
  current_step_order INTEGER DEFAULT 0,
  next_step_due_at TIMESTAMPTZ,

  -- Stop tracking
  stopped_reason TEXT,
  stopped_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step execution log
CREATE TABLE email_automation_step_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES email_automation_enrollments(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES email_automation_steps(id) ON DELETE CASCADE,

  scheduled_for TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ,

  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'skipped', 'failed', 'stopped')),
  skip_reason TEXT,
  error_message TEXT,

  -- Link to actual email sent
  email_log_id UUID REFERENCES email_logs(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for cron processing
CREATE INDEX idx_enrollments_active_due
  ON email_automation_enrollments(status, next_step_due_at)
  WHERE status = 'active';

CREATE INDEX idx_enrollments_trigger
  ON email_automation_enrollments(trigger_record_type, trigger_record_id);

CREATE INDEX idx_step_logs_pending
  ON email_automation_step_logs(status, scheduled_for)
  WHERE status = 'pending';

-- RLS
ALTER TABLE email_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_automation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_automation_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_automation_step_logs ENABLE ROW LEVEL SECURITY;

-- Admins can manage automations
CREATE POLICY "admin_all_automations" ON email_automations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "admin_all_steps" ON email_automation_steps FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "admin_all_enrollments" ON email_automation_enrollments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "admin_all_logs" ON email_automation_step_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Service role for cron job
CREATE POLICY "service_enrollments" ON email_automation_enrollments FOR ALL USING (true);
CREATE POLICY "service_logs" ON email_automation_step_logs FOR ALL USING (true);
