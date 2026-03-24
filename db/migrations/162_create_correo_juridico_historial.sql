-- 162_create_correo_juridico_historial.sql
-- Crea la tabla de historial/timeline de eventos para correos jurídicos

CREATE TABLE IF NOT EXISTS legal_management.correo_juridico_historial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correo_juridico_id UUID NOT NULL REFERENCES legal_management.correos_juridicos(id) ON DELETE CASCADE,
    tipo_evento VARCHAR(50) NOT NULL,  -- RECIBIDO, CLASIFICADO_IA, CLASIFICACION_MANUAL, ASOCIADO_PROCESO, LEIDO, ARCHIVADO, RESPONDIDO, REENVIADO
    descripcion TEXT NOT NULL,
    detalle_json JSONB,
    usuario VARCHAR(255) NOT NULL DEFAULT 'Sistema',
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historial_correo_id ON legal_management.correo_juridico_historial(correo_juridico_id);
CREATE INDEX IF NOT EXISTS idx_historial_tipo_evento ON legal_management.correo_juridico_historial(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON legal_management.correo_juridico_historial(fecha_creacion DESC);
