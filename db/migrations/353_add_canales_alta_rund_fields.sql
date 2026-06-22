-- ============================================================
-- Migration 353: Add RUND canales de alta fields to Docente
-- ============================================================

ALTER TABLE academic_work_plan."Docente"
  ADD COLUMN IF NOT EXISTS canal_origen VARCHAR(50) DEFAULT 'MASIVO',
  ADD COLUMN IF NOT EXISTS acepta_habeas_data BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_aceptacion_habeas_data TIMESTAMP,
  ADD COLUMN IF NOT EXISTS ip_creacion VARCHAR(50);

-- Update existing records to have a default canal_origen
UPDATE academic_work_plan."Docente"
SET canal_origen = 'MASIVO'
WHERE canal_origen IS NULL;
