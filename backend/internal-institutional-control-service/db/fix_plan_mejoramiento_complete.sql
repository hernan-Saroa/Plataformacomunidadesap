-- Script completo para corregir la tabla plan_mejoramiento
-- Este script verifica y corrige todos los problemas de tipos

-- 1. Verificar el tipo actual de auditoria_id
DO $$
BEGIN
    -- Si auditoria_id es VARCHAR, cambiarlo a UUID
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'plan_mejoramiento' 
        AND column_name = 'auditoria_id' 
        AND data_type = 'character varying'
    ) THEN
        -- Primero, eliminar valores inválidos o convertirlos a NULL
        UPDATE control_interno.plan_mejoramiento 
        SET auditoria_id = NULL 
        WHERE auditoria_id IS NOT NULL 
        AND auditoria_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        
        -- Eliminar la constraint si existe
        ALTER TABLE control_interno.plan_mejoramiento 
        DROP CONSTRAINT IF EXISTS fk_plan_mejoramiento_auditoria;
        
        -- Cambiar el tipo
        ALTER TABLE control_interno.plan_mejoramiento 
        ALTER COLUMN auditoria_id TYPE UUID 
        USING CASE 
            WHEN auditoria_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
            THEN auditoria_id::uuid 
            ELSE NULL 
        END;
        
        -- Hacer nullable
        ALTER TABLE control_interno.plan_mejoramiento 
        ALTER COLUMN auditoria_id DROP NOT NULL;
        
        -- Agregar la foreign key
        ALTER TABLE control_interno.plan_mejoramiento 
        ADD CONSTRAINT fk_plan_mejoramiento_auditoria 
        FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Asegurar que hallazgo_id sea nullable
ALTER TABLE control_interno.plan_mejoramiento 
ALTER COLUMN hallazgo_id DROP NOT NULL;

-- 3. Actualizar la foreign key de hallazgo para usar SET NULL
ALTER TABLE control_interno.plan_mejoramiento 
DROP CONSTRAINT IF EXISTS fk_plan_mejoramiento_hallazgo;

ALTER TABLE control_interno.plan_mejoramiento 
ADD CONSTRAINT fk_plan_mejoramiento_hallazgo 
FOREIGN KEY (hallazgo_id) 
REFERENCES control_interno.hallazgo(id) 
ON DELETE SET NULL;

-- 4. Verificar que las columnas requeridas por la entidad existan
-- (Esto es solo para verificación, no modifica nada si ya existen)

-- Verificar que created_at y updated_at existan
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'plan_mejoramiento' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE control_interno.plan_mejoramiento 
        ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'plan_mejoramiento' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE control_interno.plan_mejoramiento 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- 5. Verificar que descripcion sea nullable (según la entidad)
ALTER TABLE control_interno.plan_mejoramiento 
ALTER COLUMN descripcion DROP NOT NULL;

