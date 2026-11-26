-- Migración 033: RF-INF-014 Alarmas y Notificaciones Multicanal (Umbral 70% y Emergencias Críticas)
-- Tabla: "infrastructure-management".solicitud_mantenimiento

BEGIN;

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS alerta_70_emitida BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fecha_alerta_70 TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS es_emergencia_critica BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS emergencia_confirmada BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS emergencia_confirmada_por VARCHAR(150) NULL,
  ADD COLUMN IF NOT EXISTS fecha_confirmacion_emergencia TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS notas_confirmacion_emergencia TEXT NULL;

COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.alerta_70_emitida
  IS 'Indica si se emitió la alerta preventiva al consumir >= 70% del tiempo límite ANS.';

COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.es_emergencia_critica
  IS 'Indica si la solicitud fue clasificada como emergencia crítica (requiere atención prioritaria y confirmación del Coordinador GIM).';

COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.emergencia_confirmada
  IS 'Indica si el Coordinador GIM confirmó / dio acuse de recibo de la emergencia crítica.';

-- Si existen solicitudes radicadas con prioridad URGENTE, marcarlas como emergencia crítica:
UPDATE "infrastructure-management".solicitud_mantenimiento
SET es_emergencia_critica = TRUE
WHERE UPPER(COALESCE(prioridad, '')) = 'URGENTE'
  AND es_emergencia_critica = FALSE;

COMMIT;
