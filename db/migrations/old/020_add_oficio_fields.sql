-- ============================================
-- Migracion: Agregar campos de oficios a evidencias
-- ============================================

ALTER TABLE internal_disciplinary_control.evidence
ADD COLUMN IF NOT EXISTS destinatario VARCHAR(255),
ADD COLUMN IF NOT EXISTS asunto VARCHAR(255);
