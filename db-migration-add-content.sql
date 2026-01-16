-- Add content column to knowledge_files if it doesn't exist
ALTER TABLE knowledge_files ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE knowledge_files ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Update existing rows to have storage_path if missing
UPDATE knowledge_files SET storage_path = storage_path WHERE storage_path IS NULL;