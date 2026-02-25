-- ============================================================================
-- MIGRACIÓN: Eliminar constraint de tipo_documento
-- Fecha: 2026-02-23
-- Descripción: Elimina el check constraint de tipo_documento para permitir
--              cualquier valor de tipo de documento en la Biblioteca.
-- ============================================================================

BEGIN;

-- Eliminar el constraint existente (permite cualquier tipo de documento)
ALTER TABLE control_interno.documento
DROP CONSTRAINT IF EXISTS documento_tipo_documento_check;

COMMIT;
