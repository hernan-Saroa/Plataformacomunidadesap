-- Migration: Add procesoAsociado fields to disciplinary_processes
-- Date: 2026-02-25
-- Description: Agregar campos para almacenar información de proceso asociado

ALTER TABLE internal_disciplinary_control.disciplinary_processes ADD COLUMN IF NOT EXISTS proceso_asociado_id UUID;
ALTER TABLE internal_disciplinary_control.disciplinary_processes ADD COLUMN IF NOT EXISTS proceso_asociado_numero VARCHAR(50);
ALTER TABLE internal_disciplinary_control.disciplinary_processes ADD COLUMN IF NOT EXISTS proceso_asociado_tipo VARCHAR(20);
ALTER TABLE internal_disciplinary_control.disciplinary_processes ADD COLUMN IF NOT EXISTS proceso_asociado_fecha TIMESTAMP;
ALTER TABLE internal_disciplinary_control.disciplinary_processes ADD COLUMN IF NOT EXISTS proceso_asociado_justificacion TEXT;

-- Crear índice para mejorar búsquedas por proceso asociado
CREATE INDEX IF NOT EXISTS idx_proceso_asociado_id ON internal_disciplinary_control.disciplinary_processes(proceso_asociado_id);
