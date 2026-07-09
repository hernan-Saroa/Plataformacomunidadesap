-- Migration 372: permitir tipos de proceso parametrizados por catálogo
-- La relación control_interno.proceso_auditable.tipo_proceso_id reemplaza
-- el CHECK hardcodeado sobre control_interno.proceso_auditable.tipo.

ALTER TABLE control_interno.proceso_auditable
DROP CONSTRAINT IF EXISTS proceso_auditable_tipo_check;
