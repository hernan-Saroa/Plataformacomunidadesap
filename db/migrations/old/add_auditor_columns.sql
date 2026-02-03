-- ============================================
-- Migración: Agregar columnas de auditores a la tabla auditoria
-- Fecha: 2025-01-XX
-- Descripción: Agrega las columnas auditor_lider_id, auditor_asignado_id y supervisor_asignado_id
--              que faltaban en el schema.sql pero están definidas en la entidad TypeORM
-- ============================================

-- Agregar columnas de auditores (Foreign Keys a auth.personas)
-- Estas columnas ya están definidas en la entidad TypeORM pero faltaban en el schema.sql

-- Verificar si las columnas ya existen antes de agregarlas
DO $$
BEGIN
    -- Agregar auditor_lider_id
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'auditor_lider_id'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN auditor_lider_id BIGINT NULL;
        
        CREATE INDEX IF NOT EXISTS idx_auditoria_auditor_lider_id 
        ON control_interno.auditoria(auditor_lider_id);
        
        RAISE NOTICE 'Columna auditor_lider_id agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna auditor_lider_id ya existe';
    END IF;

    -- Agregar auditor_asignado_id
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'auditor_asignado_id'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN auditor_asignado_id BIGINT NULL;
        
        CREATE INDEX IF NOT EXISTS idx_auditoria_auditor_asignado_id 
        ON control_interno.auditoria(auditor_asignado_id);
        
        RAISE NOTICE 'Columna auditor_asignado_id agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna auditor_asignado_id ya existe';
    END IF;

    -- Agregar supervisor_asignado_id
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'supervisor_asignado_id'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN supervisor_asignado_id BIGINT NULL;
        
        CREATE INDEX IF NOT EXISTS idx_auditoria_supervisor_asignado_id 
        ON control_interno.auditoria(supervisor_asignado_id);
        
        RAISE NOTICE 'Columna supervisor_asignado_id agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna supervisor_asignado_id ya existe';
    END IF;
END $$;

-- Verificar que las columnas se agregaron correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'control_interno' 
AND table_name = 'auditoria' 
AND column_name IN ('auditor_lider_id', 'auditor_asignado_id', 'supervisor_asignado_id')
ORDER BY column_name;

