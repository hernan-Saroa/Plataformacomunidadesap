-- Migration: Create tareas_auditoria table
-- Schema: control_interno
-- Date: 2026-01-23

-- Create enum types if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_tarea') THEN
        CREATE TYPE control_interno.estado_tarea AS ENUM (
            'Pendiente',
            'En Progreso',
            'Completada',
            'Cancelada'
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prioridad_tarea') THEN
        CREATE TYPE control_interno.prioridad_tarea AS ENUM (
            'Baja',
            'Media',
            'Alta',
            'Urgente'
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fase_tarea') THEN
        CREATE TYPE control_interno.fase_tarea AS ENUM (
            'Planeación',
            'Ejecución',
            'Comunicación',
            'Seguimiento'
        );
    END IF;
END
$$;

-- Create tareas_auditoria table
CREATE TABLE IF NOT EXISTS control_interno.tareas_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auditoria_id UUID NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    estado control_interno.estado_tarea DEFAULT 'Pendiente' NOT NULL,
    prioridad control_interno.prioridad_tarea DEFAULT 'Media' NOT NULL,
    fase control_interno.fase_tarea,
    responsable_id UUID NOT NULL,
    responsable_nombre VARCHAR(255) NOT NULL,
    fecha_vencimiento TIMESTAMP,
    fecha_completado TIMESTAMP,
    progreso INTEGER DEFAULT 0 CHECK (progreso >= 0 AND progreso <= 100),
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT fk_tarea_auditoria
        FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id)
        ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tareas_auditoria_auditoria_id ON control_interno.tareas_auditoria(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_tareas_auditoria_estado ON control_interno.tareas_auditoria(estado);
CREATE INDEX IF NOT EXISTS idx_tareas_auditoria_prioridad ON control_interno.tareas_auditoria(prioridad);
CREATE INDEX IF NOT EXISTS idx_tareas_auditoria_responsable_id ON control_interno.tareas_auditoria(responsable_id);
CREATE INDEX IF NOT EXISTS idx_tareas_auditoria_fecha_vencimiento ON control_interno.tareas_auditoria(fecha_vencimiento);

-- Add comment
COMMENT ON TABLE control_interno.tareas_auditoria IS 'Tareas personalizadas asignadas a auditorías';
