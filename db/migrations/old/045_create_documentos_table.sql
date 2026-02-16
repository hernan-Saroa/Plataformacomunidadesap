-- =====================================================
-- MIGRACIÓN 045: Crear tabla de documentos para expedientes
-- Fecha: 2025-12-26
-- Descripción: Tabla para almacenar documentos asociados a expedientes judiciales
-- =====================================================

-- Crear tabla de documentos
CREATE TABLE IF NOT EXISTS legal_management.documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expediente_id UUID NOT NULL REFERENCES legal_management.expedientes(id) ON DELETE CASCADE,
    
    -- Información del documento
    nombre VARCHAR(500) NOT NULL,
    tipo VARCHAR(100) NOT NULL, -- DEMANDA, AUTO, MEMORIAL, PRUEBA, SENTENCIA, NOTIFICACION, etc.
    descripcion TEXT,
    
    -- Archivo
    archivo_url TEXT, -- URL o ruta del archivo almacenado
    archivo_nombre_original VARCHAR(500),
    archivo_tamano INTEGER, -- Tamaño en bytes
    archivo_mime_type VARCHAR(100),
    
    -- Metadatos
    fecha_documento DATE, -- Fecha del documento (diferente a fecha de carga)
    numero_folios INTEGER,
    confidencial BOOLEAN DEFAULT FALSE,
    
    -- Auditoría
    subido_por VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_documentos_expediente ON legal_management.documentos(expediente_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tipo ON legal_management.documentos(tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_fecha ON legal_management.documentos(fecha_documento);

-- Comentarios
COMMENT ON TABLE legal_management.documentos IS 'Documentos asociados a expedientes judiciales';
COMMENT ON COLUMN legal_management.documentos.tipo IS 'Tipo de documento: DEMANDA, AUTO, MEMORIAL, PRUEBA, SENTENCIA, NOTIFICACION, OTRO';
COMMENT ON COLUMN legal_management.documentos.archivo_url IS 'URL o ruta al archivo físico o en storage';

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION legal_management.update_documentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_documentos_updated_at ON legal_management.documentos;
CREATE TRIGGER trigger_documentos_updated_at
    BEFORE UPDATE ON legal_management.documentos
    FOR EACH ROW
    EXECUTE FUNCTION legal_management.update_documentos_updated_at();

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Migración 045: Tabla de documentos creada correctamente.';
END $$;
