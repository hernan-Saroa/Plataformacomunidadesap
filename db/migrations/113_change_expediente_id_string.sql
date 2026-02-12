-- Migration: Change expediente_id from UUID to VARCHAR to support non-UUID references (like Disciplinary Radicados)
-- Created: 2026-01-31

START TRANSACTION;

-- Alter column type
ALTER TABLE legal_management.correos_juridicos 
ALTER COLUMN expediente_id TYPE VARCHAR(255) USING expediente_id::VARCHAR;

COMMIT;
