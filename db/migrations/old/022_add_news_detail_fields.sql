-- ============================================
-- Migration 022: Add detalle fields to disciplinary_news
-- Description: Adds fechaQueja and conductas to disciplinary_news
-- Dependencies: 012_create_disciplinary_schema.sql
-- ============================================

ALTER TABLE internal_disciplinary_control.disciplinary_news
  ADD COLUMN IF NOT EXISTS "fechaQueja" TIMESTAMP;

ALTER TABLE internal_disciplinary_control.disciplinary_news
  ADD COLUMN IF NOT EXISTS conductas TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN internal_disciplinary_control.disciplinary_news."fechaQueja" IS 'Fecha reportada de la queja/hechos';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_news.conductas IS 'Conductas presuntamente indisciplinarias';

-- ============================================
-- END OF MIGRATION
-- ============================================
