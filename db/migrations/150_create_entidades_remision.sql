-- Migration: Create entidades_remision table
-- Schema: internal_disciplinary_control
-- Date: 2026-02-27
-- Description: Tabla para gestionar las entidades de remisión en procesos disciplinarios

-- Create entidades_remision table
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.entidades_remision (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    correo VARCHAR(255) NOT NULL,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_entidades_remision_activo ON internal_disciplinary_control.entidades_remision(activo);
CREATE INDEX IF NOT EXISTS idx_entidades_remision_nombre ON internal_disciplinary_control.entidades_remision(nombre);

-- Insert seed data
INSERT INTO internal_disciplinary_control.entidades_remision (nombre, correo, activo)
SELECT 'Procuraduría General de la Nación', 'disciplinario@procuraduria.gov.co', true
WHERE NOT EXISTS (
    SELECT 1 FROM internal_disciplinary_control.entidades_remision 
    WHERE nombre = 'Procuraduría General de la Nación'
);

INSERT INTO internal_disciplinary_control.entidades_remision (nombre, correo, activo)
SELECT 'Contraloría General de la República', 'denuncias@contraloria.gov.co', true
WHERE NOT EXISTS (
    SELECT 1 FROM internal_disciplinary_control.entidades_remision 
    WHERE nombre = 'Contraloría General de la República'
);

INSERT INTO internal_disciplinary_control.entidades_remision (nombre, correo, activo)
SELECT 'Fiscalía General de la Nación', 'denuncia@fiscalia.gov.co', true
WHERE NOT EXISTS (
    SELECT 1 FROM internal_disciplinary_control.entidades_remision 
    WHERE nombre = 'Fiscalía General de la Nación'
);

INSERT INTO internal_disciplinary_control.entidades_remision (nombre, correo, activo)
SELECT 'Defensoría del Pueblo', 'proteccion@defensoria.gov.co', true
WHERE NOT EXISTS (
    SELECT 1 FROM internal_disciplinary_control.entidades_remision 
    WHERE nombre = 'Defensoría del Pueblo'
);

INSERT INTO internal_disciplinary_control.entidades_remision (nombre, correo, activo)
SELECT 'Oficina de Control Disciplinario Interno', 'disciplinario@universidad.edu.co', true
WHERE NOT EXISTS (
    SELECT 1 FROM internal_disciplinary_control.entidades_remision 
    WHERE nombre = 'Oficina de Control Disciplinario Interno'
);

-- Add comments
COMMENT ON TABLE internal_disciplinary_control.entidades_remision IS 'Tabla para gestionar las entidades de remisión en procesos disciplinarios';
COMMENT ON COLUMN internal_disciplinary_control.entidades_remision.nombre IS 'Nombre de la entidad de remisión';
COMMENT ON COLUMN internal_disciplinary_control.entidades_remision.correo IS 'Correo electrónico de la entidad de remisión';
COMMENT ON COLUMN internal_disciplinary_control.entidades_remision.activo IS 'Indica si la entidad está activa';
COMMENT ON COLUMN internal_disciplinary_control.entidades_remision.created_at IS 'Fecha de creación del registro';
COMMENT ON COLUMN internal_disciplinary_control.entidades_remision.updated_at IS 'Fecha de última actualización del registro';
