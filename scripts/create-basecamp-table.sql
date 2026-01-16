-- Create basecamp_activities table
CREATE TABLE IF NOT EXISTS basecamp_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  kind VARCHAR NOT NULL, -- 'todo_created', 'todo_completed'
  basecamp_request_id VARCHAR,
  task_id VARCHAR NOT NULL,
  project_id VARCHAR,
  project_title VARCHAR,
  recording_status VARCHAR,
  recording_title VARCHAR,
  recording_type VARCHAR,
  recording_position INTEGER DEFAULT 0,
  parent_id VARCHAR,
  parent_title VARCHAR,
  parent_type VARCHAR,
  recording_content TEXT,
  basecamp_created_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_basecamp_activities_task_id ON basecamp_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_basecamp_activities_client_id ON basecamp_activities(client_id);
CREATE INDEX IF NOT EXISTS idx_basecamp_activities_project_id ON basecamp_activities(project_id);
