-- ============================================
-- Tabla: actors (Demandantes, Demandados, Otros)
-- ============================================

CREATE TABLE IF NOT EXISTS legal_management.actors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expediente_id UUID NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    tipo_persona VARCHAR(50) NOT NULL, -- NATURAL, JURIDICA
    identificacion VARCHAR(50),
    rol VARCHAR(50) NOT NULL, -- DEMANDANTE, DEMANDADO, OTRO
    cargo VARCHAR(100), -- Opcional, para demandados/otros
    email VARCHAR(255),
    telefono VARCHAR(50),
    direccion VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_actor_expediente FOREIGN KEY (expediente_id)
        REFERENCES legal_management.expedientes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_actors_expediente ON legal_management.actors(expediente_id);
CREATE INDEX IF NOT EXISTS idx_actors_rol ON legal_management.actors(rol);
