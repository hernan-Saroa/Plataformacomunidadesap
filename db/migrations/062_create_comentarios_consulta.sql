
-- Crear tabla para comentarios de consultas jurídicas
CREATE TABLE IF NOT EXISTS legal_management.comentarios_consulta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consulta_id UUID NOT NULL REFERENCES legal_management.consultas_juridicas(id) ON DELETE CASCADE,
    mensaje TEXT NOT NULL,
    usuario VARCHAR(255) NOT NULL,
    cargo VARCHAR(255),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comentarios_consulta_id ON legal_management.comentarios_consulta(consulta_id);


