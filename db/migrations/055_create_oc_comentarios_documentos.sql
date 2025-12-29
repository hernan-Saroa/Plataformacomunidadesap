-- =====================================================
-- Migración: Comentarios y Documentos para Órganos de Control
-- Schema: legal_management
-- =====================================================

SET search_path TO legal_management, public;

-- =====================================================
-- TABLA: comentarios_oc (Comentarios de requerimientos OC)
-- =====================================================
CREATE TABLE IF NOT EXISTS comentarios_oc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación con requerimiento
    requerimiento_id UUID NOT NULL REFERENCES requerimientos_oc(id) ON DELETE CASCADE,
    
    -- Contenido
    contenido TEXT NOT NULL,
    tipo VARCHAR(30) DEFAULT 'general' 
        CHECK (tipo IN ('general', 'importante', 'seguimiento', 'interno', 'respuesta')),
    
    -- Autor
    autor_id UUID REFERENCES abogados(id),
    autor_nombre VARCHAR(200),
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA: documentos_oc (Documentos de requerimientos OC)
-- =====================================================
CREATE TABLE IF NOT EXISTS documentos_oc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación con requerimiento
    requerimiento_id UUID NOT NULL REFERENCES requerimientos_oc(id) ON DELETE CASCADE,
    
    -- Información del documento
    nombre VARCHAR(255) NOT NULL,
    tipo_documento VARCHAR(50) DEFAULT 'otro'
        CHECK (tipo_documento IN ('oficio', 'respuesta', 'anexo', 'acuse', 'informe', 'evidencia', 'otro')),
    descripcion TEXT,
    
    -- Archivo
    archivo_url TEXT,
    tamano_bytes BIGINT,
    mime_type VARCHAR(100),
    
    -- Metadatos
    subido_por VARCHAR(200),
    fecha_documento DATE,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_comentarios_oc_req ON comentarios_oc(requerimiento_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_oc_fecha ON comentarios_oc(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_documentos_oc_req ON documentos_oc(requerimiento_id);
CREATE INDEX IF NOT EXISTS idx_documentos_oc_tipo ON documentos_oc(tipo_documento);

-- =====================================================
-- TRIGGER: Updated_at automático
-- =====================================================
CREATE OR REPLACE FUNCTION legal_management.update_oc_comentarios_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comentarios_oc_updated ON legal_management.comentarios_oc;
CREATE TRIGGER trg_comentarios_oc_updated
    BEFORE UPDATE ON legal_management.comentarios_oc
    FOR EACH ROW
    EXECUTE FUNCTION legal_management.update_oc_comentarios_timestamp();

DROP TRIGGER IF EXISTS trg_documentos_oc_updated ON legal_management.documentos_oc;
CREATE TRIGGER trg_documentos_oc_updated
    BEFORE UPDATE ON legal_management.documentos_oc
    FOR EACH ROW
    EXECUTE FUNCTION legal_management.update_oc_comentarios_timestamp();

-- =====================================================
-- Verificación
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migración 055_create_oc_comentarios_documentos.sql ejecutada correctamente';
    RAISE NOTICE '   - Tabla comentarios_oc creada';
    RAISE NOTICE '   - Tabla documentos_oc creada';
    RAISE NOTICE '   - Índices y triggers creados';
END $$;
