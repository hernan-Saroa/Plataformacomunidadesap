-- Migration: 184_create_disciplinary_behaviors_table.sql
-- Description: Creates the disciplinary_behaviors table to parametrize conductas indisciplinarias
-- Date: 2026-04-15
-- This migration is idempotent and can be run multiple times without errors

-- Create disciplinary_behaviors table (idempotent)
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.disciplinary_behaviors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion text,
    estado boolean DEFAULT true NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add primary key constraint (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'internal_disciplinary_control.disciplinary_behaviors'::regclass 
          AND contype = 'p'
    ) THEN
        ALTER TABLE ONLY internal_disciplinary_control.disciplinary_behaviors
            ADD CONSTRAINT disciplinary_behaviors_pkey PRIMARY KEY (id);
    END IF;
END $$;

-- Add unique constraint on codigo (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = 'internal_disciplinary_control.disciplinary_behaviors'::regclass
          AND i.indisunique = true
          AND a.attname = 'codigo'
    ) THEN
        ALTER TABLE ONLY internal_disciplinary_control.disciplinary_behaviors
            ADD CONSTRAINT disciplinary_behaviors_codigo_unique UNIQUE (codigo);
    END IF;
END $$;

-- Add unique constraint on nombre (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = 'internal_disciplinary_control.disciplinary_behaviors'::regclass
          AND i.indisunique = true
          AND a.attname = 'nombre'
    ) THEN
        ALTER TABLE ONLY internal_disciplinary_control.disciplinary_behaviors
            ADD CONSTRAINT disciplinary_behaviors_nombre_unique UNIQUE (nombre);
    END IF;
END $$;

-- Add check constraint for orden >= 0 (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'internal_disciplinary_control.disciplinary_behaviors'::regclass 
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%orden%'
    ) THEN
        ALTER TABLE ONLY internal_disciplinary_control.disciplinary_behaviors
            ADD CONSTRAINT disciplinary_behaviors_orden_check CHECK (orden >= 0);
    END IF;
END $$;

-- Add comments (idempotent - comments can be updated without issues)
COMMENT ON TABLE internal_disciplinary_control.disciplinary_behaviors IS 'Catálogo parametrizable de conductas indisciplinarias';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_behaviors.id IS 'Identificador único de la conducta';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_behaviors.codigo IS 'Código único de la conducta (ej: ABANDONO_CARGO)';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_behaviors.nombre IS 'Nombre descriptivo de la conducta';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_behaviors.descripcion IS 'Descripción detallada de la conducta';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_behaviors.estado IS 'Estado activo/inactivo de la conducta';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_behaviors.orden IS 'Orden de visualización en listas';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_behaviors.created_at IS 'Fecha de creación del registro';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_behaviors.updated_at IS 'Fecha de última actualización';

-- Create indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_disciplinary_behaviors_estado ON internal_disciplinary_control.disciplinary_behaviors USING btree (estado);
CREATE INDEX IF NOT EXISTS idx_disciplinary_behaviors_orden ON internal_disciplinary_control.disciplinary_behaviors USING btree (orden);

-- Insert initial data without duplication (idempotent)
INSERT INTO internal_disciplinary_control.disciplinary_behaviors (codigo, nombre, descripcion, estado, orden) VALUES
('ABANDONO_CARGO', 'Abandono del cargo', 'Abandono injustificado de las funciones asignadas', true, 1),
('ACOSO_LABORAL', 'Acoso laboral', 'Conductas de acoso hacia compañeros de trabajo', true, 2),
('ACOSO_SEXUAL', 'Acoso sexual', 'Conductas de acoso de naturaleza sexual', true, 3),
('CONFLICTO_INTERESES', 'Conflicto de intereses', 'Situaciones donde existe conflicto entre intereses personales y laborales', true, 4),
('DESCONOCIMIENTO_JERARQUIA', 'Desconocimiento de jerarquía', 'Falta de respeto a la estructura jerárquica de la organización', true, 5),
('INCUMPLIMIENTO_DEBERES', 'Incumplimiento de deberes', 'No cumplimiento de las obligaciones laborales asignadas', true, 6),
('INASISTENCIA_INJUSTIFICADA', 'Inasistencia injustificada', 'Ausencias del trabajo sin justificación válida', true, 7),
('IRREGULARIDADES_CONTRATACION', 'Irregularidades en contratación', 'Irregularidades en procesos de contratación', true, 8),
('MAL_USO_RECURSOS_PUBLICOS', 'Mal uso de recursos públicos', 'Uso indebido de recursos públicos o institucionales', true, 9),
('NEGLIGENCIA_FUNCIONES', 'Negligencia en funciones', 'Falta de cuidado y diligencia en el desempeño de funciones', true, 10),
('OMISION_DENUNCIA', 'Omisión de denunciar', 'No reportar situaciones que requieren denuncia obligatoria', true, 11),
('RETARDO_INJUSTIFICADO', 'Retardo injustificado', 'Llegadas tardías al trabajo sin justificación', true, 12),
('TRATO_DESCORTES_CIUDADANO', 'Trato descortés al ciudadano', 'Falta de cortesía y respeto hacia los ciudadanos', true, 13),
('VIOLACION_RESERVA', 'Violación de reserva', 'Divulgación de información reservada o confidencial', true, 14),
('OTRO', 'Otro', 'Otra conducta no especificada en el catálogo', true, 15)
ON CONFLICT (codigo) DO NOTHING;

-- Create trigger function (idempotent - CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION internal_disciplinary_control.update_disciplinary_behaviors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_disciplinary_behaviors_updated_at') THEN
        CREATE TRIGGER trigger_update_disciplinary_behaviors_updated_at
            BEFORE UPDATE ON internal_disciplinary_control.disciplinary_behaviors
            FOR EACH ROW
            EXECUTE FUNCTION internal_disciplinary_control.update_disciplinary_behaviors_updated_at();
    END IF;
END $$;