-- 693_rund_decision_periodo_prueba.sql
-- HU 2424: decisión del Comité Docente sobre el periodo de prueba. Se guarda la decisión vigente del docente
-- (resultado, fecha del comité, soporte, motivo, observación, quién y cuándo, y la vinculación y el estado que
-- tenía antes) para poder corregirla. El historial completo sigue en academic_work_plan."RundAprobacionLog".
-- Aditiva e idempotente: no modifica ningún dato existente.
BEGIN;

ALTER TABLE academic_work_plan."Docente"
  ADD COLUMN IF NOT EXISTS "decisionPeriodoPrueba" JSONB;

COMMIT;
