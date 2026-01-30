-- Migration: Create table for email attachments
-- Stores metadata about email attachments from Microsoft Graph

SET search_path TO legal_management, public;

CREATE TABLE IF NOT EXISTS adjuntos_correo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación con correo
    correo_id UUID NOT NULL REFERENCES correos_juridicos(id) ON DELETE CASCADE,
    
    -- IDs de Microsoft Graph (para descargar bajo demanda)
    graph_message_id VARCHAR(500) NOT NULL,
    graph_attachment_id VARCHAR(500) NOT NULL,
    
    -- Metadata del adjunto
    nombre VARCHAR(500) NOT NULL,
    content_type VARCHAR(255),
    tamanio INTEGER DEFAULT 0, -- bytes
    
    -- Archivo local (si se descargó y guardó localmente)
    archivo_local_url TEXT,
    descargado BOOLEAN DEFAULT false,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_adjuntos_correo_id ON adjuntos_correo(correo_id);
CREATE INDEX IF NOT EXISTS idx_adjuntos_graph_message ON adjuntos_correo(graph_message_id);

-- Comentarios
COMMENT ON TABLE adjuntos_correo IS 'Adjuntos de correos electrónicos sincronizados desde Microsoft Graph';
COMMENT ON COLUMN adjuntos_correo.graph_attachment_id IS 'ID del adjunto en Graph API, usado para descarga bajo demanda';
COMMENT ON COLUMN adjuntos_correo.archivo_local_url IS 'Ruta local si el archivo fue descargado al servidor';

-- Verificación
DO $$
BEGIN
    RAISE NOTICE '✅ Migración 068_create_adjuntos_correo.sql ejecutada correctamente';
    RAISE NOTICE '   - Tabla adjuntos_correo creada';
END $$;
