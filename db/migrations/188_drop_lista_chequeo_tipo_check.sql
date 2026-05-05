-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 188: Eliminar constraint de tipo en lista_chequeo
-- Fecha: 2026-04-14
-- Descripción: Elimina el CHECK constraint antiguo y permite los valores del 
--              workflow OCI (planeacion, ejecucion, comunicacion, seguimiento)
-- ═══════════════════════════════════════════════════════════════════════════

-- Eliminar constraint antiguo que solo permitía: cumplimiento, proceso, sistema, procedimiento
ALTER TABLE control_interno.lista_chequeo 
DROP CONSTRAINT IF EXISTS lista_chequeo_tipo_check;

-- Cambiar tipo de columna de ENUM a VARCHAR si existe el ENUM
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'tipo_lista_chequeo_enum'
  ) THEN
    -- Cambiar tipo a VARCHAR
    ALTER TABLE control_interno.lista_chequeo 
      ALTER COLUMN tipo TYPE VARCHAR(100) 
      USING tipo::VARCHAR;
    
    -- Eliminar el tipo ENUM si no está en uso
    DROP TYPE IF EXISTS control_interno.tipo_lista_chequeo_enum CASCADE;
    
    RAISE NOTICE '✅ Tipo ENUM eliminado y columna convertida a VARCHAR';
  END IF;
END $$;

-- Agregar nuevo CHECK constraint con valores del workflow OCI
ALTER TABLE control_interno.lista_chequeo
  ADD CONSTRAINT lista_chequeo_tipo_check 
  CHECK (tipo IN ('planeacion', 'ejecucion', 'comunicacion', 'seguimiento'));

-- Actualizar valores existentes si los hay
UPDATE control_interno.lista_chequeo 
SET tipo = 'planeacion' 
WHERE tipo IN ('cumplimiento', 'proceso', 'sistema', 'procedimiento');

-- Log
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Migración 188: Constraint de tipo en lista_chequeo actualizado para workflow OCI'; 
END $$;
