-- Migration: Add 'restaurado' column to disciplinary_processes table
-- Date: 2026-04-15
-- Description: Adds a boolean column to track if a disciplinary process has been restored from archived status
-- Schema: internal_disciplinary_control

-- Agregar la columna 'restaurado' a la tabla disciplinary_processes
ALTER TABLE internal_disciplinary_control.disciplinary_processes
ADD COLUMN IF NOT EXISTS restaurado BOOLEAN NOT NULL DEFAULT FALSE;

-- Agregar comentario descriptivo a la columna
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_processes.restaurado IS 'Indica si el proceso disciplinario fue restaurado desde estado archivado';

-- Crear índice para optimizar consultas que filtren por estado restaurado
CREATE INDEX IF NOT EXISTS idx_disciplinary_processes_restaurado
ON internal_disciplinary_control.disciplinary_processes (restaurado);

-- Verificar que la columna se agregó correctamente
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'internal_disciplinary_control'
    AND table_name = 'disciplinary_processes'
    AND column_name = 'restaurado';