-- Banco de Docentes: columnas adicionales en Docente y Persona
-- academic_work_plan schema

ALTER TABLE academic_work_plan."Docente"
  ADD COLUMN IF NOT EXISTS "escalafon"                      TEXT,
  ADD COLUMN IF NOT EXISTS "origenVinculacion"              TEXT,
  ADD COLUMN IF NOT EXISTS "actoAdministrativoVinculacion"  TEXT,
  ADD COLUMN IF NOT EXISTS "situacionAdministrativa"        TEXT,
  ADD COLUMN IF NOT EXISTS "ultimaEvaluacion"               TEXT,
  ADD COLUMN IF NOT EXISTS "puntajeSalarial"                FLOAT,
  ADD COLUMN IF NOT EXISTS "fechaInicioVinculacion"         TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "fechaFinVinculacion"            TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "edadReferencia"                 INTEGER,
  ADD COLUMN IF NOT EXISTS "rangoEdad"                      TEXT;

ALTER TABLE academic_work_plan."Persona"
  ADD COLUMN IF NOT EXISTS "fecha_fin_contrato" TIMESTAMP;
