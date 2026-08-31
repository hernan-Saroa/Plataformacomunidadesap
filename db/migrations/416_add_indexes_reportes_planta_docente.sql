-- ============================================================
-- Migration 416: Índices de soporte para el reporte de planta
-- docente con filtros combinables (territorial, tipo de
-- vinculación, categoría, género, nivel de formación, núcleo
-- temático, período académico).
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_docente_escalafon"
ON academic_work_plan."Docente" ("escalafon");

CREATE INDEX IF NOT EXISTS "idx_docente_nucleoTematico"
ON academic_work_plan."Docente" ("nucleoTematico");

CREATE INDEX IF NOT EXISTS "idx_docente_nivelFormacion"
ON academic_work_plan."Docente" ("nivelFormacion");

CREATE INDEX IF NOT EXISTS "idx_docente_tipoVinculacion"
ON academic_work_plan."Docente" ("tipoVinculacion");

CREATE INDEX IF NOT EXISTS "idx_docente_periodoCarga"
ON academic_work_plan."Docente" ("periodoCarga");

CREATE INDEX IF NOT EXISTS "idx_docente_territorialId"
ON academic_work_plan."Docente" ("territorialId");

CREATE INDEX IF NOT EXISTS "idx_personas_gen_tercero"
ON auth.personas ("gen_tercero");
