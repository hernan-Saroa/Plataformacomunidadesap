-- Script para hacer nullable la columna hallazgo_codigo en plan_mejoramiento
-- La entidad TypeORM no incluye esta columna, por lo que debe ser nullable

ALTER TABLE control_interno.plan_mejoramiento 
ALTER COLUMN hallazgo_codigo DROP NOT NULL;

-- Verificar el resultado
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'control_interno' 
AND table_name = 'plan_mejoramiento' 
AND column_name = 'hallazgo_codigo';

