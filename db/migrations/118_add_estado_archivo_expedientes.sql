-- Migration: Add estado_archivo and related fields to expedientes table
-- This enables soft-delete and archive functionality

-- Add estado_archivo column with enum-like constraint
ALTER TABLE legal_management.expedientes 
ADD COLUMN IF NOT EXISTS estado_archivo VARCHAR(20) DEFAULT 'ACTIVO';

-- Add archive metadata columns
ALTER TABLE legal_management.expedientes
ADD COLUMN IF NOT EXISTS fecha_archivo TIMESTAMP;

ALTER TABLE legal_management.expedientes
ADD COLUMN IF NOT EXISTS usuario_archivo VARCHAR(255);

ALTER TABLE legal_management.expedientes
ADD COLUMN IF NOT EXISTS motivo_archivo TEXT;

-- Add constraint to ensure valid values for estado_archivo
ALTER TABLE legal_management.expedientes
ADD CONSTRAINT chk_estado_archivo 
CHECK (estado_archivo IN ('ACTIVO', 'ARCHIVADO', 'ELIMINADO'));

-- Create index for filtering by estado_archivo (improves query performance)
CREATE INDEX IF NOT EXISTS idx_expedientes_estado_archivo 
ON legal_management.expedientes(estado_archivo);

-- Update all existing records to have ACTIVO status
UPDATE legal_management.expedientes 
SET estado_archivo = 'ACTIVO' 
WHERE estado_archivo IS NULL;

-- Make estado_archivo NOT NULL after setting defaults
ALTER TABLE legal_management.expedientes 
ALTER COLUMN estado_archivo SET NOT NULL;

COMMENT ON COLUMN legal_management.expedientes.estado_archivo IS 'Estado de archivo: ACTIVO (en Kanban), ARCHIVADO (guardado), ELIMINADO (soft delete)';
COMMENT ON COLUMN legal_management.expedientes.fecha_archivo IS 'Fecha en que se archivó o eliminó el expediente';
COMMENT ON COLUMN legal_management.expedientes.usuario_archivo IS 'Usuario que realizó la acción de archivar/eliminar';
COMMENT ON COLUMN legal_management.expedientes.motivo_archivo IS 'Razón o motivo del archivo/eliminación';
