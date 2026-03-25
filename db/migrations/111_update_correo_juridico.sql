-- Migration 111: Update correos_juridicos table for Smart Mailbox features
-- Adds AI suggestion columns and link to legal processes

ALTER TABLE legal_management.correos_juridicos
ADD COLUMN IF NOT EXISTS ai_suggested_category VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_trained BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS expediente_id UUID;

-- Optional: Add Foreign Key constraint if you want strict referential integrity
-- ALTER TABLE legal_management.correos_juridicos
-- ADD CONSTRAINT fk_correo_expediente
-- FOREIGN KEY (expediente_id) REFERENCES legal_management.expedientes(id)
-- ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_correos_juridicos_expediente ON legal_management.correos_juridicos(expediente_id);
