-- =============================================================================
-- EFDS-1737 / Migración 017 · Columnas Conformidad del Área Solicitante
-- Ambientes: todos
-- Propósito: Agregar 7 columnas para controlar el paso de conformidad
--            después de COMPLETADA (cierre técnico). CERRADA confirmada,
--            CERRADA_SIN_ATENCION sin respuesta, o reabierto a EN_PROGRESO
--            con reloj SLA nuevo de 24 horas.
--
-- =============================================================================

SET LOCAL search_path = "infrastructure-management", public;

-- Fecha real de confirmación o cierre automático
ALTER TABLE solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS fecha_conformidad TIMESTAMPTZ NULL;

-- Usuario que ejecutó la acción de conformidad (solicitante o admin bypass)
ALTER TABLE solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS usuario_conformidad_id UUID NULL;

-- Display "email · nombre" trazabilidad auditoría
ALTER TABLE solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS responsable_conformidad_display VARCHAR(200) NULL;

-- Resultado del cierre conformidad
ALTER TABLE solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS resultado_conformidad VARCHAR(40) NULL;

ALTER TABLE solicitud_mantenimiento
  DROP CONSTRAINT IF EXISTS ck_solicitud_mantenimiento_resultado_conformidad;
ALTER TABLE solicitud_mantenimiento
  ADD CONSTRAINT ck_solicitud_mantenimiento_resultado_conformidad
  CHECK (resultado_conformidad IS NULL OR resultado_conformidad IN (
    'CONFIRMADA',
    'SIN_RESPUESTA',
    'RECHAZADA_Y_REABIERTA'
  ));

-- Texto observaciones confirmación o devolución (obligatorio para rechazo)
ALTER TABLE solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS observaciones_conformidad TEXT NULL;

-- Tope máximo para responder sin que se cierre solo sin respuesta
ALTER TABLE solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS fecha_limite_conformidad TIMESTAMPTZ NULL;

-- Cuenta cuántas veces se ha devuelto la solicitud por no conformidad
ALTER TABLE solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS conteo_reaperturas_conformidad SMALLINT NOT NULL DEFAULT 0;

-- =============================================================================
-- Backfill manual opcional (des-comentar si se quieren cierres históricos):
-- Actualiza COMPLETADAS existentes con 72h de plazo partiendo desde el
-- cierre técnico. Las que ya vencieron no pasarán automáticamente; eso
-- depende de ejecutar POST mantenimiento/ejecutar-cierres-sin-respuesta.
-- =============================================================================
-- UPDATE solicitud_mantenimiento
--    SET fecha_limite_conformidad = fecha_cierre_tecnico + INTERVAL '72 hours',
--        conteo_reaperturas_conformidad = 0
--  WHERE estado = 'COMPLETADA'
--    AND fecha_cierre_tecnico IS NOT NULL
--    AND fecha_limite_conformidad IS NULL;
