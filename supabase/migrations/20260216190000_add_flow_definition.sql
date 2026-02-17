-- Add flow_definition column to store the visual workflow layout
-- This preserves node positions, condition nodes, and the complete graph structure

ALTER TABLE email_automations
ADD COLUMN IF NOT EXISTS flow_definition JSONB;

COMMENT ON COLUMN email_automations.flow_definition IS 'Stores the ReactFlow nodes and edges for visual editor persistence';
