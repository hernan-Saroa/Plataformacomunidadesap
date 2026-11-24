-- 694_rund_ciclo_docente_comite_recategorizacion.sql
-- HU 2349: ciclo de estados del docente (Validado → Comité Docente → Apto para incorporación / Activo),
-- inactivación/reactivación con motivo y recategorización (nuevos soportes → revisión → comité → actualización).
--  * Docente."decisionComiteIncorporacion": decisión vigente del comité para la incorporación (resultado, fecha,
--    soporte, motivo, quién y cuándo y el estado que tenía). El historial completo sigue en RundAprobacionLog.
--  * RundRecategorizacion: solicitudes de recategorización. Guardan la propuesta aparte: la información vigente del
--    docente NO cambia hasta que el comité aprueba.
-- Aditiva e idempotente: no modifica ningún dato existente.
BEGIN;

ALTER TABLE academic_work_plan."Docente"
  ADD COLUMN IF NOT EXISTS "decisionComiteIncorporacion" JSONB;

CREATE TABLE IF NOT EXISTS academic_work_plan."RundRecategorizacion" (
  id UUID PRIMARY KEY,
  docente_id TEXT NOT NULL,
  estado TEXT NOT NULL,
  justificacion TEXT NOT NULL,
  propuesta JSONB NOT NULL DEFAULT '{}'::jsonb,
  soporte_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  revision JSONB,
  decision_comite JSONB,
  aplicado JSONB,
  creado_por TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rund_recategorizacion_docente
  ON academic_work_plan."RundRecategorizacion" (docente_id, "createdAt" DESC);

-- Una sola recategorización abierta por docente.
CREATE UNIQUE INDEX IF NOT EXISTS uq_rund_recategorizacion_abierta
  ON academic_work_plan."RundRecategorizacion" (docente_id)
  WHERE estado IN ('EN_REVISION', 'EN_COMITE');

COMMIT;
