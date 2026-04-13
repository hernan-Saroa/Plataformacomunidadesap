-- Migration: Change etapaActual from enum to VARCHAR(100)
-- Description: Convert the etapaActual field in disciplinary_processes table from enum to VARCHAR(100)
-- Date: 2026-04-10
-- Author: Kilo

-- Convert enum column to VARCHAR(100)
ALTER TABLE internal_disciplinary_control.disciplinary_processes
ALTER COLUMN "etapaActual" TYPE VARCHAR(100);

-- Update comment
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_processes."etapaActual"
IS 'Etapa actual del proceso disciplinario (VARCHAR - flexible para nuevas etapas)';