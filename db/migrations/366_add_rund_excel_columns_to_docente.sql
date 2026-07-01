-- ============================================================
-- Migration 366: Preserve official RUND Excel fields in Docente
-- ============================================================

ALTER TABLE academic_work_plan."Docente"
  ADD COLUMN IF NOT EXISTS "sexoBiologico" TEXT,
  ADD COLUMN IF NOT EXISTS "dedicacionHorasSemana" INTEGER,
  ADD COLUMN IF NOT EXISTS "situacionCategoria" TEXT;
