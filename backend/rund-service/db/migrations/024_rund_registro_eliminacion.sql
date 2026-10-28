-- REQ-RUND (673 embebido): eliminación lógica por registro/periodo. Conserva personas, cuentas, soportes y PTA históricos.
ALTER TABLE rund."Docente"
  ADD COLUMN IF NOT EXISTS "eliminadoRund" boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN rund."Docente"."eliminadoRund"
  IS 'Registro retirado del banco RUND por un cargador. Responsable, fecha y motivo en RundAprobacionLog.';
-- Un nuevo registro del mismo periodo debe tener su propio expediente e historial.
DROP INDEX IF EXISTS rund."Docente_personaId_periodoCarga_key";
CREATE UNIQUE INDEX "Docente_personaId_periodoCarga_key"
  ON rund."Docente" ("personaId", COALESCE("periodoCarga", ''))
  WHERE "eliminadoRund" = false;
