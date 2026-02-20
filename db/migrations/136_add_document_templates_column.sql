-- Migración #136: Agregar columna documentTemplates
-- Agregar soporte para guardar plantillas de oficios, autos y actas
-- Fecha: 2026-02-19
-- Autor: Control Interno Disciplinario

-- Agregar columna documentTemplates para almacenar plantillas de documentos
ALTER TABLE internal_disciplinary_control.system_configuration
ADD COLUMN IF NOT EXISTS "documentTemplates" jsonb DEFAULT '{}'::jsonb;

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'internal_disciplinary_control'
  AND table_name = 'system_configuration'
  AND column_name = 'documentTemplates';
