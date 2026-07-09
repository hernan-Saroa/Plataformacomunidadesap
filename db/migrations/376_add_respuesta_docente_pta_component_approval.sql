-- =============================================================================
-- 376: Respuesta del docente al reenviar un componente devuelto del PTA
-- =============================================================================
-- Cuando el revisor devuelve un componente (o "Concertar" lo devuelve, ver
-- migraciones/servicio de aprobación por componente), el docente corrige y
-- reenvía, pero no había forma de que explicara qué corrigió o por qué. Esta
-- columna guarda ese comentario del docente, para que el revisor lo vea al
-- volver a concertar/aprobar, junto al comentario original que él dejó.
-- Idempotente.
-- =============================================================================

ALTER TABLE academic_work_plan."PtaComponentApproval"
  ADD COLUMN IF NOT EXISTS respuesta_docente text NULL;

COMMENT ON COLUMN academic_work_plan."PtaComponentApproval".respuesta_docente IS
  'Respuesta del docente al reenviar un componente devuelto: por qué lo reenvía / qué corrigió.';
