BEGIN;
SET LOCAL search_path = "infrastructure-management", public;

ALTER TABLE ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS calificacion_servicio SMALLINT NULL;
ALTER TABLE ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  DROP CONSTRAINT IF EXISTS ck_ALTER TABLE "infrastructure-management".solicitud_mantenimiento_calificacion_servicio_rango;
ALTER TABLE ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD CONSTRAINT ck_ALTER TABLE "infrastructure-management".solicitud_mantenimiento_calificacion_servicio_rango
  CHECK (calificacion_servicio IS NULL OR calificacion_servicio BETWEEN 1 AND 5);

ALTER TABLE ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS fecha_calificacion TIMESTAMPTZ NULL;

ALTER TABLE ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS usuario_calificacion_id UUID NULL;

ALTER TABLE ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS responsable_calificacion_display VARCHAR(200) NULL;

CREATE INDEX IF NOT EXISTS idx_sol_man_calificacion_servicio_notnull
  ON ALTER TABLE "infrastructure-management".solicitud_mantenimiento (estado, resultado_conformidad, calificacion_servicio)
  WHERE calificacion_servicio IS NOT NULL;

COMMIT;
