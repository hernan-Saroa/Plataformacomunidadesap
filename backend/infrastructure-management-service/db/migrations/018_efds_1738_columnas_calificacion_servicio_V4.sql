BEGIN;

SET LOCAL search_path = "infrastructure-management", public;

-- 1. Calificación del servicio (1 a 5)
ALTER TABLE "infrastructure-management".solicitud_mantenimiento
    ADD COLUMN IF NOT EXISTS calificacion_servicio SMALLINT NULL;

-- 2. Eliminar constraint anterior si existe
ALTER TABLE "infrastructure-management".solicitud_mantenimiento
    DROP CONSTRAINT IF EXISTS
    ck_solicitud_mantenimiento_calificacion_servicio_rango;

-- 3. Validar rango de calificación
ALTER TABLE "infrastructure-management".solicitud_mantenimiento
    ADD CONSTRAINT
    ck_solicitud_mantenimiento_calificacion_servicio_rango
    CHECK (
        calificacion_servicio IS NULL
        OR calificacion_servicio BETWEEN 1 AND 5
    );

-- 4. Fecha de calificación
ALTER TABLE "infrastructure-management".solicitud_mantenimiento
    ADD COLUMN IF NOT EXISTS fecha_calificacion TIMESTAMPTZ NULL;

-- 5. Usuario que realiza la calificación
ALTER TABLE "infrastructure-management".solicitud_mantenimiento
    ADD COLUMN IF NOT EXISTS usuario_calificacion_id UUID NULL;

-- 6. Nombre del responsable que califica
ALTER TABLE "infrastructure-management".solicitud_mantenimiento
    ADD COLUMN IF NOT EXISTS responsable_calificacion_display VARCHAR(200) NULL;

-- 7. Índice para consultas de calificaciones
CREATE INDEX IF NOT EXISTS idx_sol_man_calificacion_servicio_notnull
    ON "infrastructure-management".solicitud_mantenimiento
    (estado, resultado_conformidad, calificacion_servicio)
    WHERE calificacion_servicio IS NOT NULL;

COMMIT;
