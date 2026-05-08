-- Add alcance column to auth.role table
-- JSON type column to store administrative scope configuration

ALTER TABLE auth.role
ADD COLUMN alcance JSONB;