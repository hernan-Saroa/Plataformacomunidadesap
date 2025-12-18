-- Script completo para corregir todas las columnas de plan_mejoramiento
-- Hace nullable las columnas que no están en la entidad TypeORM

-- 1. Hacer hallazgo_codigo nullable
ALTER TABLE control_interno.plan_mejoramiento 
ALTER COLUMN hallazgo_codigo DROP NOT NULL;

-- 2. Verificar y hacer nullable otras columnas que no están en la entidad TypeORM
-- Estas columnas existen en el schema pero no en la entidad TypeORM

-- fecha_creacion (no está en la entidad, solo created_at)
ALTER TABLE control_interno.plan_mejoramiento 
ALTER COLUMN fecha_creacion DROP NOT NULL;

-- fecha_inicio_ejecucion (no está en la entidad)
ALTER TABLE control_interno.plan_mejoramiento 
ALTER COLUMN fecha_inicio_ejecucion DROP NOT NULL;

-- fecha_cierre (no está en la entidad)
ALTER TABLE control_interno.plan_mejoramiento 
ALTER COLUMN fecha_cierre DROP NOT NULL;

-- recursos (no está en la entidad)
ALTER TABLE control_interno.plan_mejoramiento 
ALTER COLUMN recursos DROP NOT NULL;

-- indicadores (no está en la entidad)
ALTER TABLE control_interno.plan_mejoramiento 
ALTER COLUMN indicadores DROP NOT NULL;

-- seguimientos (no está en la entidad, se maneja con relaciones)
ALTER TABLE control_interno.plan_mejoramiento 
ALTER COLUMN seguimientos DROP NOT NULL;

-- Verificar el resultado
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'control_interno' 
AND table_name = 'plan_mejoramiento' 
AND column_name IN (
    'hallazgo_codigo', 
    'fecha_creacion', 
    'fecha_inicio_ejecucion', 
    'fecha_cierre', 
    'recursos', 
    'indicadores', 
    'seguimientos'
)
ORDER BY column_name;

