-- Create table for Consultas Juridicas (Asesoría Jurídica module)
-- Término legal: 30 días hábiles según CPACA Art. 50
-- This script is idempotent - safe to run multiple times

-- Create table if not exists (minimal structure)
CREATE TABLE IF NOT EXISTS legal_management.consultas_juridicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_radicado VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drop NOT NULL from ALL legacy columns (except id and numero_radicado)
DO $$
DECLARE
    col RECORD;
BEGIN
    FOR col IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'legal_management' 
        AND table_name = 'consultas_juridicas'
        AND is_nullable = 'NO'
        AND column_name NOT IN ('id', 'numero_radicado')
    LOOP
        EXECUTE format('ALTER TABLE legal_management.consultas_juridicas ALTER COLUMN %I DROP NOT NULL', col.column_name);
        RAISE NOTICE 'Dropped NOT NULL from: %', col.column_name;
    END LOOP;
END $$;

-- Add ALL columns (safe to run if they already exist)
ALTER TABLE legal_management.consultas_juridicas ADD COLUMN IF NOT EXISTS fecha_recepcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE legal_management.consultas_juridicas ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE legal_management.consultas_juridicas ADD COLUMN IF NOT EXISTS prioridad VARCHAR(10) DEFAULT 'media';
ALTER TABLE legal_management.consultas_juridicas ADD COLUMN IF NOT EXISTS estado VARCHAR(30) DEFAULT 'en_radicacion';
ALTER TABLE legal_management.consultas_juridicas ADD COLUMN IF NOT EXISTS abogado_asignado_id UUID;
ALTER TABLE legal_management.consultas_juridicas ADD COLUMN IF NOT EXISTS fecha_asignacion TIMESTAMP;
ALTER TABLE legal_management.consultas_juridicas ADD COLUMN IF NOT EXISTS termino_legal_dias INTEGER DEFAULT 30;
ALTER TABLE legal_management.consultas_juridicas ADD COLUMN IF NOT EXISTS fecha_maxima_respuesta TIMESTAMP;
ALTER TABLE legal_management.consultas_juridicas ADD COLUMN IF NOT EXISTS fecha_respuesta TIMESTAMP;
ALTER TABLE legal_management.consultas_juridicas ADD COLUMN IF NOT EXISTS observaciones TEXT;
ALTER TABLE legal_management.consultas_juridicas ADD COLUMN IF NOT EXISTS canal_entrada VARCHAR(30);
ALTER TABLE legal_management.consultas_juridicas ADD COLUMN IF NOT EXISTS tipo_solicitud VARCHAR(30);
ALTER TABLE legal_management.consultas_juridicas ADD COLUMN IF NOT EXISTS dependencia_solicitante VARCHAR(200);
ALTER TABLE legal_management.consultas_juridicas ADD COLUMN IF NOT EXISTS nombre_solicitante VARCHAR(200);
ALTER TABLE legal_management.consultas_juridicas ADD COLUMN IF NOT EXISTS cargo_solicitante VARCHAR(100);
ALTER TABLE legal_management.consultas_juridicas ADD COLUMN IF NOT EXISTS email_solicitante VARCHAR(100);
ALTER TABLE legal_management.consultas_juridicas ADD COLUMN IF NOT EXISTS telefono_solicitante VARCHAR(30);
ALTER TABLE legal_management.consultas_juridicas ADD COLUMN IF NOT EXISTS tipo_usuario VARCHAR(20) DEFAULT 'interno';
ALTER TABLE legal_management.consultas_juridicas ADD COLUMN IF NOT EXISTS materia_juridica VARCHAR(30);
ALTER TABLE legal_management.consultas_juridicas ADD COLUMN IF NOT EXISTS antecedentes TEXT;
ALTER TABLE legal_management.consultas_juridicas ADD COLUMN IF NOT EXISTS complejidad VARCHAR(10);
ALTER TABLE legal_management.consultas_juridicas ADD COLUMN IF NOT EXISTS numero_oficio_respuesta VARCHAR(50);
ALTER TABLE legal_management.consultas_juridicas ADD COLUMN IF NOT EXISTS tipo_respuesta VARCHAR(30);
ALTER TABLE legal_management.consultas_juridicas ADD COLUMN IF NOT EXISTS documento_respuesta_url TEXT;

-- Create indexes AFTER all columns exist
CREATE INDEX IF NOT EXISTS idx_consultas_estado ON legal_management.consultas_juridicas(estado);
CREATE INDEX IF NOT EXISTS idx_consultas_abogado ON legal_management.consultas_juridicas(abogado_asignado_id);
CREATE INDEX IF NOT EXISTS idx_consultas_materia ON legal_management.consultas_juridicas(materia_juridica);
CREATE INDEX IF NOT EXISTS idx_consultas_fecha_maxima ON legal_management.consultas_juridicas(fecha_maxima_respuesta);

-- Comments
COMMENT ON TABLE legal_management.consultas_juridicas IS 'Registro de consultas y asesorías jurídicas internas de ESAP';
COMMENT ON COLUMN legal_management.consultas_juridicas.termino_legal_dias IS 'Término legal de 30 días hábiles según CPACA Art. 50';
