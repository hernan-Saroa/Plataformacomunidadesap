-- ============================================
-- Migración 047: Agregar columna alcance a auditoria
-- Fecha: 2025-01-XX
-- Descripción: Agrega la columna alcance a la tabla control_interno.auditoria
--              si no existe, para almacenar el alcance de la auditoría
-- ============================================

-- Agregar columna alcance (TEXT para almacenar texto largo)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'alcance'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN alcance TEXT;
        
        -- Agregar comentario
        COMMENT ON COLUMN control_interno.auditoria.alcance IS 
        'Alcance de la auditoría. Define las áreas a evaluar, procesos incluidos, etc.';
        
        RAISE NOTICE 'Columna alcance agregada exitosamente a control_interno.auditoria';
    ELSE
        RAISE NOTICE 'La columna alcance ya existe en control_interno.auditoria';
    END IF;
END $$;

