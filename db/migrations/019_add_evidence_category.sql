-- ============================================
-- Migracion: Agregar categoria a evidencias
-- ============================================

ALTER TABLE internal_disciplinary_control.evidence
ADD COLUMN IF NOT EXISTS categoria VARCHAR(50);
