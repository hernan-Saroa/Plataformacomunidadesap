-- 383_create_comentarios_correo.sql
-- Crea la tabla de comentarios para correos jurídicos (Centro de Comunicaciones)
--
-- Contexto: el tab "Comentarios" del modal Detalle de Comunicación no tenía
-- backend ni tabla propia; el botón "Publicar Comentario" no hacía nada.
-- Esta tabla persiste los comentarios asociados a un correo, siguiendo el
-- mismo patrón ya usado en comentarios_consulta / expedientes.
-- Schema: legal_management

CREATE TABLE IF NOT EXISTS legal_management.comentarios_correo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correo_id UUID NOT NULL REFERENCES legal_management.correos_juridicos(id) ON DELETE CASCADE,
    mensaje VARCHAR NOT NULL,
    usuario VARCHAR NOT NULL,
    cargo VARCHAR,
    fecha TIMESTAMP DEFAULT NOW()
);

-- Índice para listar los comentarios de un correo ordenados por fecha
CREATE INDEX IF NOT EXISTS idx_comentarios_correo_correo_id
    ON legal_management.comentarios_correo(correo_id);

COMMENT ON TABLE legal_management.comentarios_correo
    IS 'Comentarios del tab "Comentarios" en el Detalle de Comunicación (Centro de Comunicaciones).';
