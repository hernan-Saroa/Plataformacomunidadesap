-- Migracion 362: Agregar columna firma_activacion a la tabla plan_anual_5_roles
-- Permite guardar la firma digital de activación de los planes anuales de auditoría.

ALTER TABLE control_interno.plan_anual_5_roles 
ADD COLUMN IF NOT EXISTS firma_activacion jsonb DEFAULT null;
