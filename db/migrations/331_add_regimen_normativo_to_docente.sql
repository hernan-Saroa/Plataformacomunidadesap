-- Migration 331: Add missing columns to Docente table including regimenNormativo
-- Schema: academic_work_plan

ALTER TABLE academic_work_plan."Docente"
  ADD COLUMN IF NOT EXISTS "regimenNormativo" TEXT,
  ADD COLUMN IF NOT EXISTS "periodoCarga" TEXT,
  ADD COLUMN IF NOT EXISTS "observaciones" TEXT,
  ADD COLUMN IF NOT EXISTS "idRund" TEXT,
  ADD COLUMN IF NOT EXISTS "estadoAprobacion" TEXT DEFAULT 'PENDIENTE_APROBACION',
  ADD COLUMN IF NOT EXISTS "completitud" JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "canal_origen" TEXT DEFAULT 'MASIVO';
