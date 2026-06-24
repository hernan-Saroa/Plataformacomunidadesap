-- Migracion: columnas de seguimiento EM-FO-002 en accion_correctiva.
-- Corrige bases existentes creadas antes de que AccionCorrectiva incluyera
-- seguimiento, efectividad y verificacion OCI.

ALTER TABLE IF EXISTS control_interno.accion_correctiva
    ADD COLUMN IF NOT EXISTS hallazgo_id UUID,
    ADD COLUMN IF NOT EXISTS estado_verificacion_oci VARCHAR(20) DEFAULT 'sin_verificar',
    ADD COLUMN IF NOT EXISTS evidencia_verificada TEXT,
    ADD COLUMN IF NOT EXISTS observacion_oci TEXT,
    ADD COLUMN IF NOT EXISTS fecha_verificacion_oci TIMESTAMP,
    ADD COLUMN IF NOT EXISTS verificada_por_id BIGINT,
    ADD COLUMN IF NOT EXISTS cantidad_acciones_programadas INT,
    ADD COLUMN IF NOT EXISTS cantidad_acciones_implementadas INT,
    ADD COLUMN IF NOT EXISTS cumplimiento_emfo INT,
    ADD COLUMN IF NOT EXISTS estado_accion_seguimiento VARCHAR(20) DEFAULT 'abierta',
    ADD COLUMN IF NOT EXISTS responsable_seguimiento VARCHAR(500),
    ADD COLUMN IF NOT EXISTS observacion_cumplimiento TEXT,
    ADD COLUMN IF NOT EXISTS evaluar_aplicacion_controles BOOLEAN,
    ADD COLUMN IF NOT EXISTS validar_situacion_no_repitio BOOLEAN,
    ADD COLUMN IF NOT EXISTS efectividad_emfo INT,
    ADD COLUMN IF NOT EXISTS efectividad_verificada BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS observacion_efectividad TEXT;
