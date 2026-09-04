-- ============================================================================
-- MIGRACIÓN 426: documento de soporte al devolver un auto
-- Descripción: cuando el Jefe OCID devuelve un auto adjunta opcionalmente un
--              documento de soporte. Antes se descartaba en el frontend y nunca
--              se guardaba; se agregan columnas para persistirlo.
-- ============================================================================

ALTER TABLE internal_disciplinary_control.legal_autos
    ADD COLUMN IF NOT EXISTS "rejectionDocumentUrl" text,
    ADD COLUMN IF NOT EXISTS "rejectionDocumentName" text;
