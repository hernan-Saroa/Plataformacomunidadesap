-- Add historial column to audiencias table
ALTER TABLE legal_management.audiencias ADD COLUMN historial JSONB DEFAULT '[]'::jsonb;
