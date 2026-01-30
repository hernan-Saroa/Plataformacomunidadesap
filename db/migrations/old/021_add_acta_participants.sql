-- ============================================
-- Migracion: Agregar campo participantes para actas
-- ============================================

ALTER TABLE internal_disciplinary_control.evidence
ADD COLUMN IF NOT EXISTS participantes INTEGER;
