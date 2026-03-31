-- Migration: Create configuracion_profesionales_ocig table
-- Schema: control_interno
-- Date: 2026-02-19
-- Description: Tabla para almacenar la configuración de profesionales del equipo OCIG

-- Create enum type for OCIG roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rol_ocig') THEN
        CREATE TYPE control_interno.rol_ocig AS ENUM (
            'Jefe OCIG',
            'Auditor Sénior',
            'Auditor',
            'Auditor Júnior',
            'Apoyo Técnico'
        );
    END IF;
END
$$;

-- Create configuracion_profesionales_ocig table
CREATE TABLE IF NOT EXISTS control_interno.configuracion_profesionales_ocig (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Referencia al usuario (id_tercero de auth.personas)
    id_tercero INTEGER NOT NULL,
    
    -- Configuración OCIG
    rol_ocig control_interno.rol_ocig NOT NULL DEFAULT 'Auditor',
    especialidades TEXT[] DEFAULT '{}',
    capacidad_maxima_auditorias INTEGER NOT NULL DEFAULT 4 CHECK (capacidad_maxima_auditorias >= 1 AND capacidad_maxima_auditorias <= 15),
    horas_mensuales_disponibles INTEGER NOT NULL DEFAULT 150 CHECK (horas_mensuales_disponibles >= 20 AND horas_mensuales_disponibles <= 250),
    puede_ser_lider BOOLEAN NOT NULL DEFAULT true,
    activo BOOLEAN NOT NULL DEFAULT true,
    
    -- Metadata
    fecha_asignacion DATE NOT NULL DEFAULT CURRENT_DATE,
    observaciones TEXT,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID,
    updated_by UUID,
    
    -- Unique constraint: un usuario solo puede tener una configuración activa
    CONSTRAINT uq_profesional_ocig_activo UNIQUE (id_tercero)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_config_prof_ocig_id_tercero 
    ON control_interno.configuracion_profesionales_ocig(id_tercero);
CREATE INDEX IF NOT EXISTS idx_config_prof_ocig_rol 
    ON control_interno.configuracion_profesionales_ocig(rol_ocig);
CREATE INDEX IF NOT EXISTS idx_config_prof_ocig_activo 
    ON control_interno.configuracion_profesionales_ocig(activo);
CREATE INDEX IF NOT EXISTS idx_config_prof_ocig_puede_lider 
    ON control_interno.configuracion_profesionales_ocig(puede_ser_lider) 
    WHERE puede_ser_lider = true;

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION control_interno.update_config_prof_ocig_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_config_prof_ocig_updated_at 
    ON control_interno.configuracion_profesionales_ocig;
    
CREATE TRIGGER trigger_update_config_prof_ocig_updated_at
    BEFORE UPDATE ON control_interno.configuracion_profesionales_ocig
    FOR EACH ROW
    EXECUTE FUNCTION control_interno.update_config_prof_ocig_updated_at();

-- Add comments
COMMENT ON TABLE control_interno.configuracion_profesionales_ocig IS 
    'Configuración de profesionales asignados al equipo OCIG (Oficina de Control Interno de Gestión)';
COMMENT ON COLUMN control_interno.configuracion_profesionales_ocig.id_tercero IS 
    'ID del tercero (persona) en auth.personas';
COMMENT ON COLUMN control_interno.configuracion_profesionales_ocig.rol_ocig IS 
    'Rol del profesional dentro del equipo OCIG';
COMMENT ON COLUMN control_interno.configuracion_profesionales_ocig.especialidades IS 
    'Array de especialidades del profesional (ej: Auditoría Financiera, Auditoría TI)';
COMMENT ON COLUMN control_interno.configuracion_profesionales_ocig.capacidad_maxima_auditorias IS 
    'Número máximo de auditorías simultáneas que puede manejar';
COMMENT ON COLUMN control_interno.configuracion_profesionales_ocig.horas_mensuales_disponibles IS 
    'Horas mensuales disponibles para auditorías';
COMMENT ON COLUMN control_interno.configuracion_profesionales_ocig.puede_ser_lider IS 
    'Indica si el profesional puede ser asignado como auditor líder';
