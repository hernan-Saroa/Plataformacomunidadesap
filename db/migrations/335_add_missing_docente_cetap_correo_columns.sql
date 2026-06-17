-- Corrige columnas esperadas por DocenteEntity en academic_work_plan."Docente".
-- TypeORM selecciona todas las columnas de la entidad en findOne/find, por lo que
-- la ausencia de cualquiera de estas columnas rompe consultas como by-persona.

ALTER TABLE academic_work_plan."Docente"
  ADD COLUMN IF NOT EXISTS "cetapId" TEXT,
  ADD COLUMN IF NOT EXISTS "correoAlternativo" TEXT;

COMMENT ON COLUMN academic_work_plan."Docente"."cetapId" IS
  'Identificador opcional del CETAP asociado al docente.';

COMMENT ON COLUMN academic_work_plan."Docente"."correoAlternativo" IS
  'Correo personal o alternativo del docente para flujos RUND.';
