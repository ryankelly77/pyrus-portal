-- ============================================================
-- Email Template Manager: Database Schema
-- ============================================================
--
-- This migration creates the tables for managing email templates
-- in the admin portal, allowing admins to view and edit email
-- content without code changes.
--
-- Tables:
--   1. email_categories - Groups templates by type
--   2. email_templates - Main template definitions
--   3. email_template_versions - Audit trail for changes
--   4. email_logs - Track all sent emails
--
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS).
-- ============================================================


-- ============================================================
-- 1. email_categories - Template groupings
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Category identification
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,

  -- Display ordering
  sort_order integer DEFAULT 0,

  -- Timestamps
  created_at timestamptz DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_categories_slug
  ON public.email_categories(slug);
CREATE INDEX IF NOT EXISTS idx_email_categories_sort
  ON public.email_categories(sort_order);

-- Comments
COMMENT ON TABLE public.email_categories IS
  'Groups email templates by category (Transactional, Workflow, Sales, Alerts)';


-- ============================================================
-- 2. email_templates - Main template definitions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Category relationship
  category_id uuid REFERENCES public.email_categories(id) ON DELETE SET NULL,

  -- Template identification
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,

  -- Trigger information
  trigger_event text NOT NULL,
  trigger_description text,

  -- Recipient targeting
  recipient_type text NOT NULL CHECK (recipient_type IN ('user', 'client', 'admin', 'prospect', 'any')),

  -- Email content
  subject_template text NOT NULL,
  body_html text NOT NULL,
  body_text text,

  -- Template variables documentation
  -- Array of: { key: string, description: string, example: string }
  available_variables jsonb DEFAULT '[]'::jsonb,

  -- Status flags
  is_active boolean DEFAULT true,
  is_system boolean DEFAULT false,  -- System templates cannot be deleted

  -- Timestamps
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_slug
  ON public.email_templates(slug);
CREATE INDEX IF NOT EXISTS idx_email_templates_category
  ON public.email_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_active
  ON public.email_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_email_templates_trigger
  ON public.email_templates(trigger_event);

-- Comments
COMMENT ON TABLE public.email_templates IS
  'Email template definitions with editable content';
COMMENT ON COLUMN public.email_templates.trigger_event IS
  'Technical trigger identifier (e.g., password_reset, content_submitted)';
COMMENT ON COLUMN public.email_templates.trigger_description IS
  'Human-readable explanation of when this email is sent';
COMMENT ON COLUMN public.email_templates.available_variables IS
  'JSON array of available template variables: [{key, description, example}]';
COMMENT ON COLUMN public.email_templates.is_system IS
  'System templates cannot be deleted but can be deactivated';


-- ============================================================
-- 3. email_template_versions - Audit trail
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template relationship
  template_id uuid NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,

  -- Version tracking
  version_number integer NOT NULL,

  -- Snapshot of content at this version
  subject_template text NOT NULL,
  body_html text NOT NULL,
  body_text text,

  -- Change metadata
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  change_note text,

  -- Timestamp
  created_at timestamptz DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_template_versions_template
  ON public.email_template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_email_template_versions_version
  ON public.email_template_versions(template_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_email_template_versions_created
  ON public.email_template_versions(created_at DESC);

-- Unique constraint: one version number per template
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_template_versions_unique
  ON public.email_template_versions(template_id, version_number);

-- Comments
COMMENT ON TABLE public.email_template_versions IS
  'Audit trail of all template changes for rollback capability';
COMMENT ON COLUMN public.email_template_versions.version_number IS
  'Incrementing version number per template';


-- ============================================================
-- 4. email_logs - Sent email tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template reference (nullable for legacy/direct sends)
  template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  template_slug text,  -- Denormalized for queries even if template deleted

  -- Recipient information
  recipient_email text NOT NULL,
  recipient_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,

  -- Rendered content
  subject text NOT NULL,
  variables_used jsonb,  -- The data passed to template

  -- Delivery tracking
  mailgun_message_id text,
  status text DEFAULT 'sent' CHECK (status IN ('queued', 'sending', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced', 'complained', 'unsubscribed')),
  status_updated_at timestamptz,
  error_message text,

  -- Timestamps
  created_at timestamptz DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_template
  ON public.email_logs(template_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_template_slug
  ON public.email_logs(template_slug);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_email
  ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_user
  ON public.email_logs(recipient_user_id) WHERE recipient_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_client
  ON public.email_logs(recipient_client_id) WHERE recipient_client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_logs_status
  ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created
  ON public.email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_mailgun
  ON public.email_logs(mailgun_message_id) WHERE mailgun_message_id IS NOT NULL;

-- Comments
COMMENT ON TABLE public.email_logs IS
  'Log of all sent emails for tracking and debugging';
COMMENT ON COLUMN public.email_logs.template_slug IS
  'Denormalized slug for queries even if template is deleted';
COMMENT ON COLUMN public.email_logs.variables_used IS
  'The actual data passed to render the template';


-- ============================================================
-- 5. RLS Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.email_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------
-- email_categories
-- ----------------------

-- Authenticated users can read categories
DROP POLICY IF EXISTS "Authenticated users can read categories" ON public.email_categories;
CREATE POLICY "Authenticated users can read categories"
  ON public.email_categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify categories
DROP POLICY IF EXISTS "Admins can manage categories" ON public.email_categories;
CREATE POLICY "Admins can manage categories"
  ON public.email_categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
    )
  );

-- ----------------------
-- email_templates
-- ----------------------

-- Only admins can read templates
DROP POLICY IF EXISTS "Admins can read templates" ON public.email_templates;
CREATE POLICY "Admins can read templates"
  ON public.email_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
    )
  );

-- Only admins can modify templates
DROP POLICY IF EXISTS "Admins can manage templates" ON public.email_templates;
CREATE POLICY "Admins can manage templates"
  ON public.email_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
    )
  );

-- Service role has full access (for API operations)
DROP POLICY IF EXISTS "Service role full access to templates" ON public.email_templates;
CREATE POLICY "Service role full access to templates"
  ON public.email_templates
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ----------------------
-- email_template_versions
-- ----------------------

-- Only admins can read version history
DROP POLICY IF EXISTS "Admins can read template versions" ON public.email_template_versions;
CREATE POLICY "Admins can read template versions"
  ON public.email_template_versions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
    )
  );

-- Only admins can insert versions
DROP POLICY IF EXISTS "Admins can insert template versions" ON public.email_template_versions;
CREATE POLICY "Admins can insert template versions"
  ON public.email_template_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
    )
  );

-- Service role has full access (for API operations)
DROP POLICY IF EXISTS "Service role full access to versions" ON public.email_template_versions;
CREATE POLICY "Service role full access to versions"
  ON public.email_template_versions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ----------------------
-- email_logs
-- ----------------------

-- Only admins can read logs
DROP POLICY IF EXISTS "Admins can read email logs" ON public.email_logs;
CREATE POLICY "Admins can read email logs"
  ON public.email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
    )
  );

-- Only service role can insert/update logs (from API)
DROP POLICY IF EXISTS "Service role can manage email logs" ON public.email_logs;
CREATE POLICY "Service role can manage email logs"
  ON public.email_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ============================================================
-- 6. Seed initial categories
-- ============================================================

INSERT INTO public.email_categories (slug, name, description, sort_order)
VALUES
  ('transactional', 'Transactional', 'Authentication and account-related emails', 1),
  ('workflow', 'Workflow', 'Content management and workflow notifications', 2),
  ('sales', 'Sales & Proposals', 'Proposal invitations and sales-related emails', 3),
  ('alerts', 'Alerts & Notifications', 'Result alerts and system notifications', 4)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================
-- 7. Trigger to auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_email_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS email_templates_updated_at ON public.email_templates;
CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_email_template_timestamp();


-- ============================================================
-- 8. Trigger to auto-create version on template update
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_email_template_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version integer;
BEGIN
  -- Only create version if content actually changed
  IF OLD.subject_template IS DISTINCT FROM NEW.subject_template
     OR OLD.body_html IS DISTINCT FROM NEW.body_html
     OR OLD.body_text IS DISTINCT FROM NEW.body_text THEN

    -- Get the next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
    FROM public.email_template_versions
    WHERE template_id = NEW.id;

    -- Insert version record with OLD values (what it was before change)
    INSERT INTO public.email_template_versions (
      template_id,
      version_number,
      subject_template,
      body_html,
      body_text,
      changed_by,
      change_note
    ) VALUES (
      NEW.id,
      next_version,
      OLD.subject_template,
      OLD.body_html,
      OLD.body_text,
      NEW.updated_by,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS email_templates_version_trigger ON public.email_templates;
CREATE TRIGGER email_templates_version_trigger
  AFTER UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.create_email_template_version();


-- ============================================================
-- DOWN Migration (run manually if needed)
-- ============================================================
-- To rollback, run these commands in order:
--
-- DROP TRIGGER IF EXISTS email_templates_version_trigger ON public.email_templates;
-- DROP TRIGGER IF EXISTS email_templates_updated_at ON public.email_templates;
-- DROP FUNCTION IF EXISTS public.create_email_template_version();
-- DROP FUNCTION IF EXISTS public.update_email_template_timestamp();
-- DROP TABLE IF EXISTS public.email_logs;
-- DROP TABLE IF EXISTS public.email_template_versions;
-- DROP TABLE IF EXISTS public.email_templates;
-- DROP TABLE IF EXISTS public.email_categories;
