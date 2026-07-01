-- ============================================================
-- Migration 367: Banco de Docentes independiente por periodo
-- ============================================================

DROP INDEX IF EXISTS academic_work_plan."Docente_personaId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Docente_personaId_periodoCarga_key"
ON academic_work_plan."Docente" ("personaId", COALESCE("periodoCarga", ''));
