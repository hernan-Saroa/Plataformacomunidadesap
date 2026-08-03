-- ============================================================================
-- Migration: 391_alter_evaluacion_proceso_dependencia_responsable.sql
-- Description: Cambiar el tipo de datos de la columna dependencia_responsable de VARCHAR(255) a TEXT en control_interno.evaluacion_proceso
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
          AND table_name = 'evaluacion_proceso' 
          AND column_name = 'dependencia_responsable'
    ) THEN
        ALTER TABLE control_interno.evaluacion_proceso 
        ALTER COLUMN dependencia_responsable TYPE TEXT;
        
        RAISE NOTICE 'Columna dependencia_responsable alterada exitosamente a tipo TEXT';
    END IF;
END $$;
