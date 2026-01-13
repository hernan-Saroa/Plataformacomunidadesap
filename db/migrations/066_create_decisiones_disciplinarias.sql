-- Migration: Create decisiones_disciplinarias table for Juzgamiento module
-- Tabla para almacenar las decisiones de procesos disciplinarios de juzgamiento

-- Verificar y crear la extensión uuid si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear la tabla de decisiones disciplinarias
CREATE TABLE IF NOT EXISTS legal_management.decisiones_disciplinarias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_decision VARCHAR(100) NOT NULL, -- 'AUTO_DE_FALLO', 'ARCHIVO', 'SUSPENSION', etc.
    tipo_fallo VARCHAR(100) NOT NULL, -- 'ABSOLUTORIO', 'CONDENATORIO', 'INHIBITORIO'
    sancion VARCHAR(255), -- Tipo de sanción aplicada si aplica
    consideraciones TEXT NOT NULL, -- Consideraciones del fallo
    fundamentos_juridicos TEXT, -- Fundamentos legales de la decisión
    responsable VARCHAR(255) NOT NULL, -- Nombre del funcionario que toma la decisión
    cargo_responsable VARCHAR(255), -- Cargo del funcionario
    fecha DATE NOT NULL DEFAULT CURRENT_DATE, -- Fecha de la decisión
    expediente_id UUID NOT NULL, -- FK al expediente
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Foreign Key
    CONSTRAINT fk_decisiones_expediente
        FOREIGN KEY (expediente_id)
        REFERENCES legal_management.expedientes(id)
        ON DELETE CASCADE
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_decisiones_expediente_id ON legal_management.decisiones_disciplinarias(expediente_id);
CREATE INDEX IF NOT EXISTS idx_decisiones_fecha ON legal_management.decisiones_disciplinarias(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_decisiones_tipo ON legal_management.decisiones_disciplinarias(tipo_decision);

-- Comentarios de documentación
COMMENT ON TABLE legal_management.decisiones_disciplinarias IS 'Tabla para almacenar decisiones de procesos disciplinarios en el módulo de juzgamiento';
COMMENT ON COLUMN legal_management.decisiones_disciplinarias.tipo_decision IS 'Tipo de decisión: AUTO_DE_FALLO, ARCHIVO, SUSPENSION, etc.';
COMMENT ON COLUMN legal_management.decisiones_disciplinarias.tipo_fallo IS 'Tipo de fallo: ABSOLUTORIO, CONDENATORIO, INHIBITORIO';
