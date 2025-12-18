-- Script para agregar las columnas faltantes en plan_mejoramiento
-- Estas columnas son requeridas por la entidad TypeORM pero no existen en el schema

-- Agregar observaciones_aprobacion si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'plan_mejoramiento' 
        AND column_name = 'observaciones_aprobacion'
    ) THEN
        ALTER TABLE control_interno.plan_mejoramiento 
        ADD COLUMN observaciones_aprobacion TEXT;
        RAISE NOTICE 'Columna observaciones_aprobacion agregada';
    ELSE
        RAISE NOTICE 'Columna observaciones_aprobacion ya existe';
    END IF;
END $$;

-- Agregar motivo_rechazo si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'plan_mejoramiento' 
        AND column_name = 'motivo_rechazo'
    ) THEN
        ALTER TABLE control_interno.plan_mejoramiento 
        ADD COLUMN motivo_rechazo TEXT;
        RAISE NOTICE 'Columna motivo_rechazo agregada';
    ELSE
        RAISE NOTICE 'Columna motivo_rechazo ya existe';
    END IF;
END $$;

-- Verificar que descripcion sea nullable (según la entidad)
ALTER TABLE control_interno.plan_mejoramiento 
ALTER COLUMN descripcion DROP NOT NULL;

-- Verificar resultado final
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'control_interno' 
AND table_name = 'plan_mejoramiento' 
AND column_name IN ('observaciones_aprobacion', 'motivo_rechazo', 'descripcion')
ORDER BY column_name;

