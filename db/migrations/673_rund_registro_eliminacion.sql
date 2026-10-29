-- Eliminación lógica por registro/periodo. Conserva Personas, cuentas, soportes y PTA históricos.
ALTER TABLE academic_work_plan."Docente"
  ADD COLUMN IF NOT EXISTS "eliminadoRund" boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN academic_work_plan."Docente"."eliminadoRund"
  IS 'Registro retirado del banco RUND por un cargador. Responsable, fecha y motivo en RundAprobacionLog.';
-- Un nuevo registro del mismo periodo debe tener su propio expediente e historial.
DROP INDEX IF EXISTS academic_work_plan."Docente_personaId_periodoCarga_key";
CREATE UNIQUE INDEX "Docente_personaId_periodoCarga_key"
  ON academic_work_plan."Docente" ("personaId", COALESCE("periodoCarga", ''))
  WHERE "eliminadoRund" = false;
