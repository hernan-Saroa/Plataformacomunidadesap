-- Migration 364: keep annual-program audits out of the planning phase
-- Audits in the first Kanban column must use the internal phase "plan-anual".

ALTER TABLE control_interno.auditoria
  DROP CONSTRAINT IF EXISTS auditoria_fase_check;

ALTER TABLE control_interno.auditoria
  ADD CONSTRAINT auditoria_fase_check
  CHECK (fase IN ('plan-anual', 'planeacion', 'en-curso', 'revision', 'completada'));

ALTER TABLE control_interno.auditoria
  ALTER COLUMN fase SET DEFAULT 'plan-anual';

UPDATE control_interno.auditoria
SET fase = 'plan-anual',
    updated_at = NOW()
WHERE COALESCE(estado_kanban, '') IN ('Plan Anual', 'Programa Anual')
  AND fase = 'planeacion';
