-- Migration: Create expediente_compartido table
-- Schema: internal_disciplinary_control
-- Date: 2026-02-19
-- Description: Tabla para gestionar los enlaces compartidos de expedientes disciplinarios

-- Create enum types if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_compartido') THEN
        CREATE TYPE internal_disciplinary_control.tipo_compartido AS ENUM (
            'LINK',
            'QR',
            'EMAIL'
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_compartido') THEN
        CREATE TYPE internal_disciplinary_control.estado_compartido AS ENUM (
            'ACTIVO',
            'EXPIRADO',
            'INACTIVO'
        );
    END IF;
END
$$;

-- Create expediente_compartido table
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.expediente_compartido (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_acceso VARCHAR(255) UNIQUE NOT NULL,
    proceso_id UUID NOT NULL,
    tipo_compartido internal_disciplinary_control.tipo_compartido DEFAULT 'LINK' NOT NULL,
    estado internal_disciplinary_control.estado_compartido DEFAULT 'ACTIVO' NOT NULL,
    requiere_clave BOOLEAN DEFAULT FALSE,
    clave_hash VARCHAR(255),
    tiempo_expiracion_horas INTEGER,
    fecha_expiracion TIMESTAMP,
    email_destinatario VARCHAR(255),
    mensaje_adicional TEXT,
    creado_por VARCHAR(255),
    contador_accesos INTEGER DEFAULT 0,
    ultimo_acceso TIMESTAMP,
    ip_ultimo_acceso VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    es_publico BOOLEAN DEFAULT FALSE,
    permite_descarga BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT fk_expediente_compartido_proceso
        FOREIGN KEY (proceso_id) 
        REFERENCES internal_disciplinary_control.disciplinary_processes(id)
        ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_expediente_compartido_token ON internal_disciplinary_control.expediente_compartido(token_acceso);
CREATE INDEX IF NOT EXISTS idx_expediente_compartido_proceso ON internal_disciplinary_control.expediente_compartido(proceso_id);
CREATE INDEX IF NOT EXISTS idx_expediente_compartido_estado ON internal_disciplinary_control.expediente_compartido(estado);
CREATE INDEX IF NOT EXISTS idx_expediente_compartido_expiracion ON internal_disciplinary_control.expediente_compartido(fecha_expiracion);

-- Add comments
COMMENT ON TABLE internal_disciplinary_control.expediente_compartido IS 'Tabla para gestionar los enlaces compartidos de expedientes disciplinarios';
COMMENT ON COLUMN internal_disciplinary_control.expediente_compartido.token_acceso IS 'Token único de acceso al enlace compartido';
COMMENT ON COLUMN internal_disciplinary_control.expediente_compartido.proceso_id IS 'ID del proceso disciplinario que se comparte';
COMMENT ON COLUMN internal_disciplinary_control.expediente_compartido.tipo_compartido IS 'Tipo de compartido: LINK, QR o EMAIL';
COMMENT ON COLUMN internal_disciplinary_control.expediente_compartido.requiere_clave IS 'Indica si el enlace requiere clave de acceso';
COMMENT ON COLUMN internal_disciplinary_control.expediente_compartido.clave_hash IS 'Hash de la clave de acceso (bcrypt)';
COMMENT ON COLUMN internal_disciplinary_control.expediente_compartido.tiempo_expiracion_horas IS 'Tiempo de expiración en horas';
COMMENT ON COLUMN internal_disciplinary_control.expediente_compartido.fecha_expiracion IS 'Fecha en que expira el enlace';
COMMENT ON COLUMN internal_disciplinary_control.expediente_compartido.email_destinatario IS 'Email del destinatario (para tipo EMAIL)';
COMMENT ON COLUMN internal_disciplinary_control.expediente_compartido.mensaje_adicional IS 'Mensaje adicional incluido en el correo';
COMMENT ON COLUMN internal_disciplinary_control.expediente_compartido.es_publico IS 'Indica si el enlace es público (sin autenticación)';
