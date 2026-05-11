-- Migration 300: Refactor programas table
-- Drop existing Programa table and create new programas table with updated schema

-- Drop existing Programa table
DROP TABLE IF EXISTS academic_work_plan."Programa" CASCADE;

-- Create new programas table
CREATE TABLE IF NOT EXISTS academic_work_plan.programas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(255) NOT NULL,
    nombre VARCHAR(500) NOT NULL,
    descripcion TEXT,
    nivel_formacion VARCHAR(255),
    facultad VARCHAR(255),
    modalidad VARCHAR(255),
    duracion INTEGER,
    creditos INTEGER,
    costo_matricula DECIMAL(10,2),
    requisitos_de_ingreso TEXT,
    jornada VARCHAR(255),
    sede VARCHAR(255),
    registro_calificado JSONB,
    perfil_egresado TEXT,
    estado VARCHAR(50) DEFAULT 'ACTIVO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_programas_codigo ON academic_work_plan.programas (codigo);
CREATE INDEX IF NOT EXISTS idx_programas_facultad ON academic_work_plan.programas (facultad);
CREATE INDEX IF NOT EXISTS idx_programas_modalidad ON academic_work_plan.programas (modalidad);
CREATE INDEX IF NOT EXISTS idx_programas_estado ON academic_work_plan.programas (estado);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION academic_work_plan.update_programas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_programas_updated_at ON academic_work_plan.programas;

CREATE TRIGGER trg_programas_updated_at
    BEFORE UPDATE ON academic_work_plan.programas
    FOR EACH ROW EXECUTE FUNCTION academic_work_plan.update_programas_updated_at();