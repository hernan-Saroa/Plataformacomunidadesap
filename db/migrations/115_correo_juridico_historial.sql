-- 115_correo_juridico_historial.sql
-- Crear tabla para trazabilidad de correos jurídicos
-- Schema: legal_management

CREATE TABLE IF NOT EXISTS legal_management.correo_juridico_historial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correo_juridico_id UUID NOT NULL,
    tipo_evento VARCHAR(50) NOT NULL,
    descripcion TEXT NOT NULL,
    detalle_json JSONB,
    usuario VARCHAR(255) DEFAULT 'Sistema',
    fecha_creacion TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_correo_historial_correo
        FOREIGN KEY (correo_juridico_id)
        REFERENCES legal_management.correos_juridicos(id)
        ON DELETE CASCADE
);

-- Índice para consultas por correo
CREATE INDEX IF NOT EXISTS idx_correo_historial_correo_id
    ON legal_management.correo_juridico_historial(correo_juridico_id);

-- Índice para filtrar por tipo de evento
CREATE INDEX IF NOT EXISTS idx_correo_historial_tipo_evento
    ON legal_management.correo_juridico_historial(tipo_evento);

-- Índice para ordenar por fecha
CREATE INDEX IF NOT EXISTS idx_correo_historial_fecha
    ON legal_management.correo_juridico_historial(fecha_creacion DESC);
