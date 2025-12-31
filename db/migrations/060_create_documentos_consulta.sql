-- ================================================
-- Script 060: Crear tabla de documentos para consultas jurídicas
-- ================================================

SET search_path TO legal_management;

-- Crear tabla de documentos de consultas jurídicas
CREATE TABLE IF NOT EXISTS documentos_consulta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consulta_id UUID NOT NULL REFERENCES consultas_juridicas(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    tipo_documento VARCHAR(50) DEFAULT 'otro',
    descripcion TEXT,
    archivo_url TEXT,
    archivo_nombre_original VARCHAR(255),
    tamano_bytes BIGINT,
    mime_type VARCHAR(100),
    subido_por VARCHAR(200),
    fecha_documento DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_documentos_consulta_consulta ON documentos_consulta(consulta_id);
CREATE INDEX IF NOT EXISTS idx_documentos_consulta_tipo ON documentos_consulta(tipo_documento);

-- Comentarios
COMMENT ON TABLE documentos_consulta IS 'Documentos adjuntos a consultas jurídicas';
COMMENT ON COLUMN documentos_consulta.consulta_id IS 'Referencia a la consulta jurídica';
COMMENT ON COLUMN documentos_consulta.tipo_documento IS 'Tipo: solicitud, normativa, concepto, respuesta, otro';

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_documentos_consulta_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_documentos_consulta ON documentos_consulta;
CREATE TRIGGER trg_update_documentos_consulta
    BEFORE UPDATE ON documentos_consulta
    FOR EACH ROW
    EXECUTE FUNCTION update_documentos_consulta_updated_at();

-- Migración completada
