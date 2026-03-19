-- 169_fix_planes_evidencias_tipo_archivo_length.sql
-- Fix: tipo_archivo column was VARCHAR(50) which is too short for full MIME types
-- e.g. 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' = 73 chars

ALTER TABLE legal_management.planes_evidencias
    ALTER COLUMN tipo_archivo TYPE VARCHAR(255);
