-- Migration: Remove CHECK constraint on excepciones_procesales.tipo
-- Reason: Exception types are now configurable via ConfiguracionesSIGL, not fixed ENUMs
-- Date: 2026-02-05

-- Drop the existing CHECK constraint that limits tipo to fixed values
ALTER TABLE legal_management.excepciones_procesales 
DROP CONSTRAINT IF EXISTS excepciones_procesales_tipo_check;

-- Also increase the varchar length to accommodate longer configurable type names
ALTER TABLE legal_management.excepciones_procesales 
ALTER COLUMN tipo TYPE VARCHAR(100);

-- Optional: Add a comment to document the change
COMMENT ON COLUMN legal_management.excepciones_procesales.tipo IS 'Exception type - now configurable via ConfiguracionesSIGL, not restricted to fixed ENUM values';
