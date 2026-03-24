-- Migration: 128_add_audit_tracking_columns.sql
-- Description: Añade campos para registrar datos anteriores (previousData) y nuevos (newData) 
--              en la tabla de auditoría para tracking completo de cambios
-- Date: 2026-02-12

-- Añadir columnas para tracking de cambios
ALTER TABLE audit.request_logs
ADD COLUMN IF NOT EXISTS entity_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS entity_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS previous_data JSONB,
ADD COLUMN IF NOT EXISTS new_data JSONB,
ADD COLUMN IF NOT EXISTS changes JSONB;

-- Crear índices para mejorar consultas de auditoría
CREATE INDEX IF NOT EXISTS idx_request_logs_entity_name ON audit.request_logs(entity_name);
CREATE INDEX IF NOT EXISTS idx_request_logs_entity_id ON audit.request_logs(entity_id);

-- Comentarios descriptivos
COMMENT ON COLUMN audit.request_logs.entity_name IS 'Nombre de la entidad/tabla que fue modificada';
COMMENT ON COLUMN audit.request_logs.entity_id IS 'ID del registro que fue modificado';
COMMENT ON COLUMN audit.request_logs.previous_data IS 'Datos ANTES de la modificación (payload viejo/original)';
COMMENT ON COLUMN audit.request_logs.new_data IS 'Datos DESPUÉS de la modificación (payload nuevo/actual)';
COMMENT ON COLUMN audit.request_logs.changes IS 'Array JSON con el detalle de cambios: [{field, oldValue, newValue}]';
