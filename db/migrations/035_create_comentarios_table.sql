-- 035_create_comentarios_table.sql
-- Create table for expediente comments

CREATE TABLE IF NOT EXISTS legal_management.comentarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expediente_id UUID NOT NULL REFERENCES legal_management.expedientes(id) ON DELETE CASCADE,
    contenido TEXT NOT NULL,
    usuario_id VARCHAR(255),
    usuario_nombre VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries by expediente
CREATE INDEX IF NOT EXISTS idx_comentarios_expediente ON legal_management.comentarios(expediente_id);
