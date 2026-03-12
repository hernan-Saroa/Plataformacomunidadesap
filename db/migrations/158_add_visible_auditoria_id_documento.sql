-- ============================================================================
-- MIGRACIÓN 158: Agregar visible_auditoria_id a control_interno.documento
-- Fecha: 2026-03-11
-- Descripción: Plantillas (auditoria_id NULL) pueden indicar para qué auditoría
--              se muestran. NULL = visible para todas. Si tiene valor = solo
--              para esa auditoría.
-- ============================================================================

BEGIN;

ALTER TABLE control_interno.documento
ADD COLUMN IF NOT EXISTS visible_auditoria_id UUID;

CREATE INDEX IF NOT EXISTS idx_documento_visible_auditoria_id
ON control_interno.documento(visible_auditoria_id);

COMMIT;
