-- ============================================================================
-- Migration 006 — EFDS-1730 Opción B: upload de evidencias en paso-1
-- El diseño de 2 pasos requiere que la evidencia se guarde ANTES de que exista
-- la solicitud (uploadedEvidenciaIds). Por tanto la FK id_solicitud debe ser
-- nullable temporalmente hasta que el create radicatorio ligue la relación.
-- ============================================================================

SET search_path TO "infrastructure-management", public;

ALTER TABLE solicitud_evidencia
    ALTER COLUMN id_solicitud DROP NOT NULL;

COMMENT ON COLUMN solicitud_evidencia.id_solicitud
    IS 'FK a solicitud_mantenimiento. Puede ser NULL temporalmente cuando el usuario sube adjuntos ANTES de radicar; el create de solicitud lo actualiza a valor real vía uploadedEvidenciaIds.';

ALTER TABLE solicitud_evidencia DROP CONSTRAINT IF EXISTS chk_solicitud_evidencia_integridad;
ALTER TABLE solicitud_evidencia
    ADD CONSTRAINT chk_solicitud_evidencia_integridad
    CHECK (
        (bucket IS NOT NULL AND ruta_objeto IS NOT NULL AND tamano_bytes IS NOT NULL AND mime_type IS NOT NULL)
    );

-- Índice adicional para consultar evidencias "huérfanas" (pendientes de ligar)
CREATE INDEX IF NOT EXISTS idx_solicitud_evidencia_sin_solicitud
    ON solicitud_evidencia (id_evidencia)
    WHERE id_solicitud IS NULL;

-- FIN MIGRACIÓN 006
