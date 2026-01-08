-- ============================================
-- Migración 067: Corregir longitud de columna calificacion_riesgo
-- Fecha: 2026-01-08
-- Descripción: Cambia la columna calificacion_riesgo de VARCHAR(20) a VARCHAR(255)
--              para permitir textos más largos de calificación de riesgo
-- ============================================

-- Verificar y alterar la columna calificacion_riesgo si existe y tiene longitud incorrecta
DO $$ 
BEGIN
    -- Verificar si la columna existe y tiene longitud 20
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'calificacion_riesgo'
        AND character_maximum_length = 20
    ) THEN
        -- Alterar la columna para aumentar la longitud a 255
        ALTER TABLE control_interno.auditoria 
        ALTER COLUMN calificacion_riesgo TYPE VARCHAR(255);
        
        RAISE NOTICE 'Columna calificacion_riesgo actualizada de VARCHAR(20) a VARCHAR(255)';
    ELSIF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'calificacion_riesgo'
    ) THEN
        -- Si la columna no existe, crearla con la longitud correcta
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN calificacion_riesgo VARCHAR(255);
        
        RAISE NOTICE 'Columna calificacion_riesgo creada con VARCHAR(255)';
    ELSE
        RAISE NOTICE 'La columna calificacion_riesgo ya tiene la longitud correcta o no necesita cambios';
    END IF;
END $$;

