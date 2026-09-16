-- EFDS-1731 Opción B compacta
-- 2 columnas nuevas en solicitud_mantenimiento, 0 tablas nuevas, 0 seeds nuevos
-- Idempotente: IF NOT EXISTS en todos los ADD/CREATE

SET search_path TO "infrastructure-management";

-- 1) Columna: dueño real del ticket (filtro bandeja UMI AC-02)
ALTER TABLE solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS area_responsable_actual VARCHAR(30) NOT NULL DEFAULT 'UMI';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'chk_solicitud_area_resp_valida'
       AND conrelid = 'solicitud_mantenimiento'::regclass
  ) THEN
    ALTER TABLE solicitud_mantenimiento
      ADD CONSTRAINT chk_solicitud_area_resp_valida CHECK (
        area_responsable_actual IN ('UMI','TI','PENDIENTE_CLASIFICACION')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_solicitud_area_responsable
  ON solicitud_mantenimiento (area_responsable_actual, estado, fecha_radicacion DESC);

COMMENT ON COLUMN solicitud_mantenimiento.area_responsable_actual
  IS 'EFDS-1731: Dueño actual del ticket. Distinto a tipo_atencion (clasificación). FISICA->UMI, TECNOLOGICA->TI. Filtro bandeja UMI.';

-- 2) Columna: array JSONB con trazabilidad de todas las remisiones (AC-03 Calidad)
ALTER TABLE solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS remisiones JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN solicitud_mantenimiento.remisiones
  IS 'EFDS-1731 AC-03: Array trazabilidad remisiones. Item: {fecha,usuario_id,usuario_email,origen_area,destino_area,motivo,canal_remision,consecutivo_cruzado_ti,estado_remision}';

-- 3) Backfill de filas EFDS-1730 existentes (todas FISICA, 8 filas al 14-sep)
UPDATE solicitud_mantenimiento
   SET area_responsable_actual = COALESCE(area_responsable_actual, 'UMI'),
       remisiones = COALESCE(remisiones, '[]'::jsonb)
 WHERE area_responsable_actual IS NULL OR remisiones IS NULL;
