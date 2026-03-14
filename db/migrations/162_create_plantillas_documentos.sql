-- Migration 162: Crear tabla plantillas_documentos para gestión legal
-- Almacena plantillas Word (.docx) categorizadas por tipo de documento

CREATE TABLE IF NOT EXISTS legal_management.plantillas_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(500) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    nombre_original VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    tamano INTEGER NOT NULL,
    contenido_base64 TEXT NOT NULL,
    subido_por VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para búsqueda por categoria
CREATE INDEX IF NOT EXISTS idx_plantillas_documentos_categoria
    ON legal_management.plantillas_documentos (categoria);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION legal_management.update_plantillas_documentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_plantillas_documentos_updated_at ON legal_management.plantillas_documentos;

CREATE TRIGGER trg_plantillas_documentos_updated_at
    BEFORE UPDATE ON legal_management.plantillas_documentos
    FOR EACH ROW EXECUTE FUNCTION legal_management.update_plantillas_documentos_updated_at();
