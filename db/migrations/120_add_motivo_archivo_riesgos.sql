-- Add motivo_archivo column to riesgos table
ALTER TABLE legal_management.riesgos ADD COLUMN IF NOT EXISTS motivo_archivo TEXT;
