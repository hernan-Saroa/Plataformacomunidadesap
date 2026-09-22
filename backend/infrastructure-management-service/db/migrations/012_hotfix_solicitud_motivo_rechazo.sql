-- =====================================================================
-- EFDS-17xx (Hotfix 012): Columna motivo_rechazo en solicitud_mantenimiento
--   Idempotente: la migracion 011 ya define esta columna pero no habia sido
--   aplicada en el runtime DB actual; este script ejecuta el ALTER via
--   sql directo y es re-ejecutable sin error.
--   RF-INF-005 EFDS-1734 AC02: Motivo rechazo >=10 chars VISIBLE solicitante.
-- =====================================================================

SET search_path TO "infrastructure-management", public;

-- 1. Agregar columna motivo_rechazo si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'infrastructure-management'
          AND table_name   = 'solicitud_mantenimiento'
          AND column_name  = 'motivo_rechazo'
    ) THEN
        ALTER TABLE solicitud_mantenimiento
            ADD COLUMN motivo_rechazo TEXT NULL;
        RAISE NOTICE '[MIG 012] columna motivo_rechazo (TEXT) creada OK.';
    ELSE
        RAISE NOTICE '[MIG 012] columna motivo_rechazo ya existe, sin cambios.';
    END IF;
END $$;

-- 2. Comentario de columna
COMMENT ON COLUMN solicitud_mantenimiento.motivo_rechazo
    IS 'Hotfix 012 / EFDS-1734 RF-INF-005 AC02: Motivo rechazo encabezado UMI length>=10 visible solicitante. NULL cuando la solicitud no esta RECHAZADA. Backfill retroactivo con placeholder para registros RECHAZADA pre-migracion.';

-- 3. Backfill retroactivo: solicitudes RECHAZADA sin motivo ponen placeholder
UPDATE solicitud_mantenimiento
   SET motivo_rechazo = COALESCE(
        motivo_rechazo,
        '[Rechazo anterior a EFDS-1734] Registro manual sin motivo capturado.'
   )
 WHERE estado = 'RECHAZADA'
   AND motivo_rechazo IS NULL;

-- 4. Indice composito estado + fecha_limite (repetido del 011, idempotente CREATE IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_sol_man_estado_fecha_limite
    ON solicitud_mantenimiento (estado, fecha_limite_atencion DESC)
    WHERE estado IN ('RECIBIDA','ASIGNADA','EN_ANALISIS','EN_PROGRESO','RECHAZADA');

-- FIN MIGRACION 012 HOTFIX MOTIVO_RECHAZO
