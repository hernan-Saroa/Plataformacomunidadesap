-- Migration: 069_create_excepciones_procesales.sql
-- Creates table for procedural exceptions in the legal_management schema
-- Types: NULIDAD, RECUSACION, PRESCRIPCION, IMPEDIMENTO, OTRA
-- Estados: PENDIENTE, RESUELTA, RECHAZADA

-- Ensure uuid extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create excepciones_procesales table
CREATE TABLE IF NOT EXISTS legal_management.excepciones_procesales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('NULIDAD', 'RECUSACION', 'PRESCRIPCION', 'IMPEDIMENTO', 'OTRA')),
    descripcion TEXT NOT NULL,
    fundamento TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'RESUELTA', 'RECHAZADA')),
    resolucion TEXT,
    fecha_presentacion DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_resolucion DATE,
    presentado_por VARCHAR(255),
    expediente_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Foreign key to expedientes table
    CONSTRAINT fk_excepcion_expediente 
        FOREIGN KEY (expediente_id) 
        REFERENCES legal_management.expedientes(id)
        ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_excepciones_expediente 
    ON legal_management.excepciones_procesales(expediente_id);

CREATE INDEX IF NOT EXISTS idx_excepciones_tipo 
    ON legal_management.excepciones_procesales(tipo);

CREATE INDEX IF NOT EXISTS idx_excepciones_estado 
    ON legal_management.excepciones_procesales(estado);

-- Add comment to table
COMMENT ON TABLE legal_management.excepciones_procesales IS 'Excepciones procesales del módulo de Juzgamiento Disciplinario';
COMMENT ON COLUMN legal_management.excepciones_procesales.tipo IS 'Tipo de excepción: NULIDAD, RECUSACION, PRESCRIPCION, IMPEDIMENTO, OTRA';
COMMENT ON COLUMN legal_management.excepciones_procesales.estado IS 'Estado de la excepción: PENDIENTE, RESUELTA, RECHAZADA';
