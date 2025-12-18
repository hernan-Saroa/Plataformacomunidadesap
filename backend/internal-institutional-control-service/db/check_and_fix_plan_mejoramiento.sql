-- Script para verificar y corregir el tipo de auditoria_id en plan_mejoramiento

-- Paso 1: Verificar el tipo actual
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'control_interno' 
AND table_name = 'plan_mejoramiento' 
AND column_name IN ('auditoria_id', 'hallazgo_id');

-- Paso 2: Si auditoria_id es VARCHAR, corregirlo
DO $$
DECLARE
    current_type TEXT;
BEGIN
    -- Obtener el tipo actual
    SELECT data_type INTO current_type
    FROM information_schema.columns 
    WHERE table_schema = 'control_interno' 
    AND table_name = 'plan_mejoramiento' 
    AND column_name = 'auditoria_id';
    
    -- Si es character varying, cambiarlo
    IF current_type = 'character varying' THEN
        RAISE NOTICE 'Cambiando auditoria_id de VARCHAR a UUID...';
        
        -- Eliminar constraint
        ALTER TABLE control_interno.plan_mejoramiento 
        DROP CONSTRAINT IF EXISTS fk_plan_mejoramiento_auditoria;
        
        -- Limpiar valores inválidos
        UPDATE control_interno.plan_mejoramiento 
        SET auditoria_id = NULL 
        WHERE auditoria_id IS NOT NULL 
        AND (auditoria_id = '' OR auditoria_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
        
        -- Cambiar tipo
        ALTER TABLE control_interno.plan_mejoramiento 
        ALTER COLUMN auditoria_id TYPE UUID 
        USING NULLIF(auditoria_id, '')::uuid;
        
        -- Hacer nullable
        ALTER TABLE control_interno.plan_mejoramiento 
        ALTER COLUMN auditoria_id DROP NOT NULL;
        
        -- Agregar constraint
        ALTER TABLE control_interno.plan_mejoramiento 
        ADD CONSTRAINT fk_plan_mejoramiento_auditoria 
        FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'auditoria_id cambiado exitosamente a UUID';
    ELSE
        RAISE NOTICE 'auditoria_id ya es del tipo correcto: %', current_type;
    END IF;
END $$;

-- Paso 3: Asegurar que hallazgo_id sea nullable
ALTER TABLE control_interno.plan_mejoramiento 
ALTER COLUMN hallazgo_id DROP NOT NULL;

-- Paso 4: Verificar el resultado final
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'control_interno' 
AND table_name = 'plan_mejoramiento' 
AND column_name IN ('auditoria_id', 'hallazgo_id');

