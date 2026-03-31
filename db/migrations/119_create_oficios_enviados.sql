-- Migration: Create oficios_enviados table
-- Purpose: Store sent oficios (judicial letters) with template support
-- Date: 2026-02-05

-- Ensure UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create oficios_enviados table
CREATE TABLE IF NOT EXISTS legal_management.oficios_enviados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero VARCHAR(50) NOT NULL,
    expediente_id VARCHAR(100) NOT NULL,
    modulo VARCHAR(50), -- 'juzgamiento-disciplinario', 'defensa-judicial', 'procesos-coactivos', etc.
    asunto VARCHAR(500) NOT NULL,
    destinatario VARCHAR(300) NOT NULL,
    destinatario_email VARCHAR(200),
    contenido TEXT NOT NULL,
    contenido_html TEXT, -- HTML content as sent via email (template rendered)
    firma VARCHAR(200),
    plantilla VARCHAR(50), -- 'prorroga', 'remision', 'contestacion', 'solicitudPruebas', 'oficioBlanco'
    estado VARCHAR(30) DEFAULT 'ENVIADO',
    fecha_envio TIMESTAMP DEFAULT NOW(),
    archivos_adjuntos JSONB, -- Array of {nombre, url, tipo, size}
    graph_message_id VARCHAR(200), -- Microsoft Graph message ID if sent via email
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_oficios_expediente ON legal_management.oficios_enviados(expediente_id);
CREATE INDEX IF NOT EXISTS idx_oficios_modulo ON legal_management.oficios_enviados(modulo);
CREATE INDEX IF NOT EXISTS idx_oficios_fecha ON legal_management.oficios_enviados(fecha_envio DESC);

-- Comment
COMMENT ON TABLE legal_management.oficios_enviados IS 'Oficios judiciales enviados desde el sistema, con soporte para plantillas institucionales ESAP';
