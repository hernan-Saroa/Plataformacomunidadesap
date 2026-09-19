-- =====================================================================
-- EFDS-1734 RF-INF-005: Asignación (aprobar / rechazar / redistribuir)
--   columna motivo_rechazo (visible solicitante) + índice composito
--   estado + fechaLimite para bandeja asignación.
-- Idempotente: re-ejecutable sin errores.
-- Dependencias: 010 (cols fecha_limite, asignaciones) + 010_02 opcional.
-- =====================================================================

SET search_path TO "infrastructure-management";

-- ---------------------------------------------------------------------
-- Paso 1: Columna motivo_rechazo TEXT nullable por categoría.
-- AC-02 EFDS1734: "Motivo rechazo obligatorio >=10 chars y VISIBLE al
-- solicitante (payload findById + listados)."
-- ---------------------------------------------------------------------
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
        COMMENT ON COLUMN solicitud_mantenimiento.motivo_rechazo
            IS 'EFDS-1734 RF-INF-005 AC02: Motivo rechazo encabezado UMI length>=10. VISIBLE solicitante en findById/listado. Limpia a NULL si la solicitud se re-aprueba luego (action APROBADA_Y_ASIGNADA).';
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- Paso 2: Índice compuesto estado + fecha_limite DESC para filtros
-- "bandeja encargado UMI" RF-INF-005 asignación rápido.
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sol_man_estado_fecha_limite
    ON solicitud_mantenimiento (estado, fecha_limite_atencion DESC)
    WHERE estado IN ('RECIBIDA','ASIGNADA','EN_ANALISIS','EN_PROGRESO','RECHAZADA');

-- ---------------------------------------------------------------------
-- Paso 3: Backfill retroactivo: solicitudes con estado = 'RECHAZADA'
-- y motivo_rechazo NULL → colocar texto default placeholder indicando
-- rechazo manual pre-1734 (no obliga a rehacer datos).
-- ---------------------------------------------------------------------
UPDATE solicitud_mantenimiento
   SET motivo_rechazo = COALESCE(
        motivo_rechazo,
        '[Rechazo anterior a EFDS-1734] Registro manual sin motivo capturado.'
   )
 WHERE estado = 'RECHAZADA'
   AND motivo_rechazo IS NULL;
