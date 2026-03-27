-- Migration: Create tipos_remision table
-- Schema: internal_disciplinary_control
-- Date: 2026-03-26
-- Description: Tabla para gestionar los tipos de remisión en procesos disciplinarios

-- Create tipos_remision table
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.tipos_remision (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(100) NOT NULL UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tipos_remision_activo ON internal_disciplinary_control.tipos_remision(activo);
CREATE INDEX IF NOT EXISTS idx_tipos_remision_codigo ON internal_disciplinary_control.tipos_remision(codigo);
CREATE INDEX IF NOT EXISTS idx_tipos_remision_orden ON internal_disciplinary_control.tipos_remision(orden);

-- Insert seed data
INSERT INTO internal_disciplinary_control.tipos_remision (codigo, nombre, descripcion, activo, orden)
SELECT 'sin-competencia', 'Sin competencia disciplinaria', 'La noticia no corresponde a la competencia disciplinaria de la entidad', true, 1
WHERE NOT EXISTS (
    SELECT 1 FROM internal_disciplinary_control.tipos_remision 
    WHERE codigo = 'sin-competencia'
);

INSERT INTO internal_disciplinary_control.tipos_remision (codigo, nombre, descripcion, activo, orden)
SELECT 'factor-territorial', 'Por factor territorial', 'Remisión por competencia territorial del servidor público', true, 2
WHERE NOT EXISTS (
    SELECT 1 FROM internal_disciplinary_control.tipos_remision 
    WHERE codigo = 'factor-territorial'
);

INSERT INTO internal_disciplinary_control.tipos_remision (codigo, nombre, descripcion, activo, orden)
SELECT 'factor-funcional', 'Por factor funcional (servidor de otra entidad)', 'Remisión por factor funcional cuando el servidor pertenece a otra entidad', true, 3
WHERE NOT EXISTS (
    SELECT 1 FROM internal_disciplinary_control.tipos_remision 
    WHERE codigo = 'factor-funcional'
);

INSERT INTO internal_disciplinary_control.tipos_remision (codigo, nombre, descripcion, activo, orden)
SELECT 'naturaleza-falta', 'Por naturaleza de la falta (penal, fiscal)', 'Remisión cuando la falta tiene naturaleza penal o fiscal', true, 4
WHERE NOT EXISTS (
    SELECT 1 FROM internal_disciplinary_control.tipos_remision 
    WHERE codigo = 'naturaleza-falta'
);

INSERT INTO internal_disciplinary_control.tipos_remision (codigo, nombre, descripcion, activo, orden)
SELECT 'prelacion-competencia', 'Por prelación de competencia (Procuraduría)', 'Remisión por prelación de competencia a la Procuraduría General de la Nación', true, 5
WHERE NOT EXISTS (
    SELECT 1 FROM internal_disciplinary_control.tipos_remision 
    WHERE codigo = 'prelacion-competencia'
);

-- Add comments
COMMENT ON TABLE internal_disciplinary_control.tipos_remision IS 'Tabla para gestionar los tipos de remisión en procesos disciplinarios';
COMMENT ON COLUMN internal_disciplinary_control.tipos_remision.codigo IS 'Código único del tipo de remisión';
COMMENT ON COLUMN internal_disciplinary_control.tipos_remision.nombre IS 'Nombre del tipo de remisión';
COMMENT ON COLUMN internal_disciplinary_control.tipos_remision.descripcion IS 'Descripción del tipo de remisión';
COMMENT ON COLUMN internal_disciplinary_control.tipos_remision.activo IS 'Indica si el tipo está activo';
COMMENT ON COLUMN internal_disciplinary_control.tipos_remision.orden IS 'Orden de visualización del tipo';
COMMENT ON COLUMN internal_disciplinary_control.tipos_remision.created_at IS 'Fecha de creación del registro';
COMMENT ON COLUMN internal_disciplinary_control.tipos_remision.updated_at IS 'Fecha de última actualización del registro';
