-- Migration 065: Create correos_juridicos table for Microsoft Graph email integration
-- Run manually by user

CREATE TABLE IF NOT EXISTS legal_management.correos_juridicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    graph_message_id VARCHAR(500) UNIQUE NOT NULL,
    asunto VARCHAR(500) NOT NULL,
    remitente_email VARCHAR(255) NOT NULL,
    remitente_nombre VARCHAR(255),
    destinatarios TEXT,
    fecha_recepcion TIMESTAMP NOT NULL,
    cuerpo_html TEXT,
    cuerpo_texto TEXT,
    tiene_adjuntos BOOLEAN DEFAULT false,
    leido BOOLEAN DEFAULT false,
    archivado BOOLEAN DEFAULT false,
    urgente BOOLEAN DEFAULT false,
    -- Classification fields
    tipo VARCHAR(20) DEFAULT 'CORREO', -- JUDICIAL, CORREO, OFICIO
    categoria VARCHAR(100),
    modulo_sugerido VARCHAR(100),
    confianza_clasificacion INTEGER,
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_correos_juridicos_leido ON legal_management.correos_juridicos(leido);
CREATE INDEX IF NOT EXISTS idx_correos_juridicos_fecha ON legal_management.correos_juridicos(fecha_recepcion DESC);
CREATE INDEX IF NOT EXISTS idx_correos_juridicos_tipo ON legal_management.correos_juridicos(tipo);
CREATE INDEX IF NOT EXISTS idx_correos_juridicos_urgente ON legal_management.correos_juridicos(urgente);
CREATE INDEX IF NOT EXISTS idx_correos_juridicos_archivado ON legal_management.correos_juridicos(archivado);
