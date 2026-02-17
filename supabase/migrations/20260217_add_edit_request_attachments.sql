-- Add attachments column to website_edit_requests
ALTER TABLE website_edit_requests
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

COMMENT ON COLUMN website_edit_requests.attachments IS 'Array of file attachments: [{name, url, type, size}]';
