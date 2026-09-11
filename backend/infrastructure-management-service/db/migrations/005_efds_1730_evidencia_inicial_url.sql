-- ============================================================================
-- Migration 005 — EFDS-1730 Opción B
-- Agrega columna evidencia_inicial_url a solicitud_mantenimiento (campo legacy
-- opcional: URL de evidencia inicial cuando el usuario pega un link sin subir
-- archivo. Permanece NULL si se usa la relación 1:N con solicitud_evidencia.
-- ============================================================================

SET search_path TO "infrastructure-management", public;

ALTER TABLE solicitud_mantenimiento
    ADD COLUMN IF NOT EXISTS evidencia_inicial_url TEXT;

COMMENT ON COLUMN solicitud_mantenimiento.evidencia_inicial_url
    IS 'URL legacy opcional de evidencia inicial cuando el usuario adjunta por link en vez de archivo. Preferible usar la relación 1:N en solicitud_evidencia.';

CREATE INDEX IF NOT EXISTS idx_solicitud_mantenimiento_evidencia_inicial
    ON solicitud_mantenimiento (evidencia_inicial_url) WHERE evidencia_inicial_url IS NOT NULL;

-- FIN MIGRACIÓN 005
