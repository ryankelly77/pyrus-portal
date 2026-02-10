-- Client files table for storing file references (uploads or drive links)
CREATE TABLE IF NOT EXISTS client_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('docs', 'images', 'video')),
  category TEXT NOT NULL,
  url TEXT, -- For drive links or external URLs
  file_path TEXT, -- For uploaded files (future use)
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups by client
CREATE INDEX idx_client_files_client_id ON client_files(client_id);

-- RLS policies
ALTER TABLE client_files ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage client files" ON client_files
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'production_team', 'sales')
    )
  );

-- Clients can view their own files
CREATE POLICY "Clients can view their files" ON client_files
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_client_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_files_updated_at
  BEFORE UPDATE ON client_files
  FOR EACH ROW
  EXECUTE FUNCTION update_client_files_updated_at();
